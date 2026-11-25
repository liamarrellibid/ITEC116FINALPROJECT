import { BadRequestException,Body,CanActivate,ConflictException,Controller,ExecutionContext,ForbiddenException,Get,HttpCode,HttpException,HttpStatus,Injectable,Post,Req,SetMetadata,UnauthorizedException,UseGuards } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsEmail,IsString,Length,MinLength } from 'class-validator';
import { Request } from 'express';
import { createHash,randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource,IsNull,Repository } from 'typeorm';
import { RefreshSession,User,UserRole } from './entities';

const ROLE_KEY='allowed_roles';
export const Roles=(...roles:UserRole[])=>SetMetadata(ROLE_KEY,roles);
export interface AuthRequest extends Request { user?:{sub:number;role:UserRole;email:string}; }
export class RegisterDto { @IsString() @Length(1,150) fullName:string; @IsEmail() @Length(1,255) email:string; @IsString() @MinLength(12) password:string; }
export class LoginDto { @IsEmail() email:string; @IsString() @MinLength(1) password:string; }
export class RefreshDto { @IsString() @MinLength(30) refreshToken:string; }

function hashToken(token:string){return createHash('sha256').update(token).digest('hex');}
export function validPassword(password:string,email:string){
  const p=password.toLowerCase(),e=email.toLowerCase();
  if(password.length<12) return false;
  if(p===e||p===e.split('@')[0]) return false;
  if(!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password)) return false;
  return !['password123456','password12345','qwerty123456','123456789012'].includes(p);
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt:JwtService,private config:ConfigService,private ds:DataSource,private reflector:Reflector){}
  async canActivate(ctx:ExecutionContext){
    const req=ctx.switchToHttp().getRequest<AuthRequest>(),token=req.headers.authorization?.replace(/^Bearer\s+/i,'');
    if(!token)throw new UnauthorizedException('Bearer access token required.');
    let claims:any;try{claims=await this.jwt.verifyAsync(token,{issuer:this.config.get('JWT_ISSUER','bank-api')});}catch{throw new UnauthorizedException('Access token is invalid or expired.');}
    if(!Number.isInteger(Number(claims.sub))||!Object.values(UserRole).includes(claims.role))throw new UnauthorizedException('Token claims are invalid.');
    const user=await this.ds.getRepository(User).findOne({where:{userId:Number(claims.sub),isActive:true}});
    if(!user)throw new UnauthorizedException('User account is inactive or unavailable.');
    const allowed=this.reflector.getAllAndOverride<UserRole[]>(ROLE_KEY,[ctx.getHandler(),ctx.getClass()]);
    if(allowed?.length&&!allowed.includes(user.role))throw new ForbiddenException('Your role cannot perform this action.');
    req.user={sub:user.userId,role:user.role,email:user.email};return true;
  }
}

@Injectable()
export class AuthService {
  private failures=new Map<string,{count:number;until:number}>();
  constructor(@InjectRepository(User) private users:Repository<User>,@InjectRepository(RefreshSession) private sessions:Repository<RefreshSession>,private jwt:JwtService,private config:ConfigService,private ds:DataSource){}
  private async issue(user:User){
    const accessToken=await this.jwt.signAsync({sub:user.userId,role:user.role,email:user.email});
    const refreshToken=randomBytes(48).toString('base64url');
    const days=Number(this.config.get('REFRESH_TOKEN_TTL_DAYS',7));
    await this.sessions.save(this.sessions.create({user,tokenHash:hashToken(refreshToken),expiresAt:new Date(Date.now()+days*86400000),revokedAt:null}));
    return {accessToken,refreshToken,tokenType:'Bearer',expiresIn:this.config.get('ACCESS_TOKEN_TTL','15m'),user:{userId:user.userId,fullName:user.fullName,email:user.email,role:user.role}};
  }
  async register(dto:RegisterDto){
    const email=dto.email.trim().toLowerCase();
    if(!validPassword(dto.password,email))throw new BadRequestException('Password must be 12+ characters, include upper/lowercase letters and a number, and must not match the email or a common sample password.');
    if(await this.users.findOne({where:{email}}))throw new ConflictException('Email already registered.');
    const user=await this.users.save(this.users.create({fullName:dto.fullName.trim(),email,passwordHash:await bcrypt.hash(dto.password,12),role:UserRole.CUSTOMER,isActive:true}));
    return {userId:user.userId,fullName:user.fullName,email:user.email,role:user.role,createdAt:user.createdAt};
  }
  async login(dto:LoginDto,ip:string){
    const key=`${ip}:${dto.email.trim().toLowerCase()}`,now=Date.now(),entry=this.failures.get(key);
    if(entry&&entry.until>now&&entry.count>=5)throw new HttpException({message:'Too many failed sign-in attempts. Try again later.',retryAfterSeconds:Math.ceil((entry.until-now)/1000)},HttpStatus.TOO_MANY_REQUESTS);
    const user=await this.users.createQueryBuilder('u').addSelect('u.passwordHash').where('u.email = :email',{email:dto.email.trim().toLowerCase()}).getOne();
    if(!user||!user.isActive||!(await bcrypt.compare(dto.password,user.passwordHash))){
      const current=this.failures.get(key);if(!current||current.until<now)this.failures.set(key,{count:1,until:now+15*60_000});else current.count++;
      throw new UnauthorizedException('Invalid email or password.');
    }
    this.failures.delete(key);return this.issue(user);
  }
  async refresh(token:string){
    const digest=hashToken(token),now=new Date(),rotated=await this.ds.transaction(async manager=>{
      const session=await manager.getRepository(RefreshSession).createQueryBuilder('s').leftJoinAndSelect('s.user','user').where('s.tokenHash = :digest',{digest}).setLock('pessimistic_write').getOne();
      if(!session||session.revokedAt||session.expiresAt<=now||!session.user.isActive)throw new UnauthorizedException('Refresh token is invalid, expired or revoked.');
      const hydratedUser=session.user;
      session.revokedAt=now;await manager.getRepository(RefreshSession).save(session);
      const refreshToken=randomBytes(48).toString('base64url'),days=Number(this.config.get('REFRESH_TOKEN_TTL_DAYS',7));
      const next=manager.getRepository(RefreshSession).create({user:session.user,tokenHash:hashToken(refreshToken),expiresAt:new Date(Date.now()+days*86400000),revokedAt:null});
      await manager.getRepository(RefreshSession).save(next);
      return {user:hydratedUser,refreshToken};
    });
    const accessToken=await this.jwt.signAsync({sub:rotated.user.userId,role:rotated.user.role,email:rotated.user.email});
    return {accessToken,refreshToken:rotated.refreshToken,tokenType:'Bearer',expiresIn:this.config.get('ACCESS_TOKEN_TTL','15m'),user:{userId:rotated.user.userId,fullName:rotated.user.fullName,email:rotated.user.email,role:rotated.user.role}};
  }
  async logout(token:string){const session=await this.sessions.findOne({where:{tokenHash:hashToken(token),revokedAt:IsNull()}});if(!session)throw new UnauthorizedException('Refresh token is invalid or already revoked.');session.revokedAt=new Date();await this.sessions.save(session);}
}

@Controller('auth')
export class AuthController {
  constructor(private auth:AuthService,@InjectRepository(User) private users:Repository<User>){}
  @Post('register') register(@Body() dto:RegisterDto){return this.auth.register(dto);}
  @Post('login') login(@Body() dto:LoginDto,@Req() req:AuthRequest){return this.auth.login(dto,req.ip||'unknown');}
  @Post('refresh') refresh(@Body() dto:RefreshDto){return this.auth.refresh(dto.refreshToken);}
  @HttpCode(204) @Post('logout') async logout(@Body() dto:RefreshDto){await this.auth.logout(dto.refreshToken);}
  @UseGuards(JwtAuthGuard) @Get('me') me(@Req() req:AuthRequest){return this.users.findOne({where:{userId:req.user!.sub}}).then(u=>({userId:u!.userId,fullName:u!.fullName,email:u!.email,role:u!.role,createdAt:u!.createdAt}));}
}
