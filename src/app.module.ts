import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ENTITIES } from './entities';
import { AuthController, AuthService, JwtAuthGuard } from './auth';
import { BankController } from './bank.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => {
        const accessSecret = env.JWT_ACCESS_SECRET;

        if (
          !accessSecret ||
          accessSecret.startsWith('replace-') ||
          accessSecret.length < 32
        ) {
          throw new Error(
            'Set JWT_ACCESS_SECRET to a random secret of at least 32 characters.',
          );
        }

        return env;
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '3306')),
        username: config.get<string>('DB_USER', 'root'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_NAME', 'bank_management'),
        entities: ENTITIES,
        synchronize: false,
        timezone: 'Z',
        charset: 'utf8mb4',
      }),
    }),
    TypeOrmModule.forFeature(ENTITIES),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          issuer: config.get<string>('JWT_ISSUER', 'bank-api'),
          expiresIn: config.get<string>('ACCESS_TOKEN_TTL', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController, BankController],
  providers: [
    AuthService,
    JwtAuthGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
