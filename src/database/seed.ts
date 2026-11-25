import 'reflect-metadata';
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { DataSource } from 'typeorm';
import { AccountStatus,AccountType,BankAccount,BankTransaction,ENTITIES,TransactionType,User,UserRole } from '../entities';
import { validPassword } from '../auth';

async function run(){
  const adminEmail=(process.env.SEED_ADMIN_EMAIL||'').toLowerCase(),adminPassword=process.env.SEED_ADMIN_PASSWORD||'',customerPassword=process.env.SEED_CUSTOMER_PASSWORD||'';
  if(!adminEmail||!validPassword(adminPassword,adminEmail)||!validPassword(customerPassword,'customer@bank.local'))throw new Error('Set unique seed passwords (12+ chars, upper/lowercase and a number) in .env first.');
  const ds=new DataSource({type:'mysql',host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),username:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,entities:ENTITIES,timezone:'Z'});
  await ds.initialize();
  try{
    const users=ds.getRepository(User),types=ds.getRepository(AccountType),accounts=ds.getRepository(BankAccount),txs=ds.getRepository(BankTransaction);
    async function user(email:string,name:string,role:UserRole,password:string){let x=await users.findOne({where:{email}});if(!x)x=await users.save(users.create({email,fullName:name,passwordHash:await bcrypt.hash(password,12),role,isActive:true}));return x;}
    const admin=await user(adminEmail,process.env.SEED_ADMIN_NAME||'Bank Admin',UserRole.ADMIN,adminPassword);
    const customer=await user('customer@bank.local','Alex Customer',UserRole.CUSTOMER,customerPassword);
    const recipient=await user('recipient@bank.local','Sam Recipient',UserRole.CUSTOMER,customerPassword);
    const savings=await typeBy('Savings','500.00','1.50'),checking=await typeBy('Checking','1000.00','0.50');
    async function typeBy(typeName:string,minimumBalance:string,interestRate:string){let t=await types.findOne({where:{typeName}});if(!t)t=await types.save(types.create({typeName,minimumBalance,interestRate}));return t;}
    if(!(await accounts.count())){
      const rows=await accounts.save([
        accounts.create({owner:customer,accountType:savings,accountNumber:String(randomInt(100000000000,999999999999)),balance:'5000.00',status:AccountStatus.ACTIVE}),
        accounts.create({owner:customer,accountType:checking,accountNumber:String(randomInt(100000000000,999999999999)),balance:'2500.00',status:AccountStatus.ACTIVE}),
        accounts.create({owner:recipient,accountType:savings,accountNumber:String(randomInt(100000000000,999999999999)),balance:'1200.00',status:AccountStatus.ACTIVE}),
      ]);
      await txs.save(rows.map((account,i)=>txs.create({account,transfer:null,transactionType:TransactionType.DEPOSIT,amount:account.balance,description:'Sample opening balance'})));
    }
    console.log(`Seed complete. Admin email: ${admin.email}. Customer: customer@bank.local. Recipient: recipient@bank.local. Customer passwords use SEED_CUSTOMER_PASSWORD.`);
  }finally{await ds.destroy();}
}
run().catch(e=>{console.error(e);process.exit(1);});
