import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole { CUSTOMER='customer', ADMIN='admin' }
export enum AccountStatus { ACTIVE='Active', INACTIVE='Inactive' }
export enum TransactionType { DEPOSIT='Deposit', WITHDRAWAL='Withdrawal', TRANSFER_IN='TransferIn', TRANSFER_OUT='TransferOut' }
export enum TransferStatus { COMPLETED='Completed' }

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({name:'user_id'}) userId:number;
  @Column({name:'full_name',length:150}) fullName:string;
  @Column({unique:true,length:255}) email:string;
  @Column({name:'password_hash',length:255,select:false}) passwordHash:string;
  @Column({type:'enum',enum:UserRole,default:UserRole.CUSTOMER}) role:UserRole;
  @Column({name:'is_active',default:true}) isActive:boolean;
  @CreateDateColumn({name:'created_at',type:'datetime',precision:6}) createdAt:Date;
  @UpdateDateColumn({name:'updated_at',type:'datetime',precision:6}) updatedAt:Date;
  @OneToMany(()=>BankAccount,a=>a.owner) accounts:BankAccount[];
  @OneToMany(()=>RefreshSession,s=>s.user) sessions:RefreshSession[];
}
@Entity('account_types')
export class AccountType {
  @PrimaryGeneratedColumn({name:'account_type_id'}) accountTypeId:number;
  @Column({name:'type_name',length:50,unique:true}) typeName:string;
  @Column({name:'minimum_balance',type:'decimal',precision:15,scale:2,default:'0.00'}) minimumBalance:string;
  @Column({name:'interest_rate',type:'decimal',precision:5,scale:2,default:'0.00'}) interestRate:string;
  @OneToMany(()=>BankAccount,a=>a.accountType) accounts:BankAccount[];
}
@Entity('accounts')
export class BankAccount {
  @PrimaryGeneratedColumn({name:'account_id'}) accountId:number;
  @ManyToOne(()=>User,u=>u.accounts,{onDelete:'RESTRICT'}) @JoinColumn({name:'user_id'}) owner:User;
  @ManyToOne(()=>AccountType,t=>t.accounts,{onDelete:'RESTRICT'}) @JoinColumn({name:'account_type_id'}) accountType:AccountType;
  @Column({name:'account_number',length:20,unique:true}) accountNumber:string;
  @Column({type:'decimal',precision:15,scale:2,default:'0.00'}) balance:string;
  @Column({type:'enum',enum:AccountStatus,default:AccountStatus.ACTIVE}) status:AccountStatus;
  @CreateDateColumn({name:'opened_at',type:'datetime',precision:6}) openedAt:Date;
  @UpdateDateColumn({name:'updated_at',type:'datetime',precision:6}) updatedAt:Date;
  @OneToMany(()=>BankTransaction,t=>t.account) transactions:BankTransaction[];
}
@Entity('transfers')
export class BankTransfer {
  @PrimaryGeneratedColumn({name:'transfer_id'}) transferId:number;
  @ManyToOne(()=>BankAccount,{onDelete:'RESTRICT'}) @JoinColumn({name:'source_account_id'}) sourceAccount:BankAccount;
  @ManyToOne(()=>BankAccount,{onDelete:'RESTRICT'}) @JoinColumn({name:'destination_account_id'}) destinationAccount:BankAccount;
  @Column({type:'decimal',precision:15,scale:2}) amount:string;
  @Column({type:'enum',enum:TransferStatus,default:TransferStatus.COMPLETED}) status:TransferStatus;
  @CreateDateColumn({name:'transferred_at',type:'datetime',precision:6}) transferredAt:Date;
}
@Entity('transactions')
export class BankTransaction {
  @PrimaryGeneratedColumn({name:'transaction_id'}) transactionId:number;
  @ManyToOne(()=>BankAccount,a=>a.transactions,{onDelete:'RESTRICT'}) @JoinColumn({name:'account_id'}) account:BankAccount;
  @ManyToOne(()=>BankTransfer,{nullable:true,onDelete:'RESTRICT'}) @JoinColumn({name:'transfer_id'}) transfer:BankTransfer|null;
  @Column({name:'transaction_type',type:'enum',enum:TransactionType}) transactionType:TransactionType;
  @Column({type:'decimal',precision:15,scale:2}) amount:string;
  @Column({name:'description',type:'varchar',length:255,nullable:true}) description:string|null;
  @CreateDateColumn({name:'transaction_date',type:'datetime',precision:6}) transactionDate:Date;
}
@Entity('refresh_sessions')
export class RefreshSession {
  @PrimaryGeneratedColumn({name:'session_id'}) sessionId:number;
  @ManyToOne(()=>User,u=>u.sessions,{onDelete:'CASCADE'}) @JoinColumn({name:'user_id'}) user:User;
  @Column({name:'token_hash',length:64,unique:true}) tokenHash:string;
  @Column({name:'expires_at',type:'datetime'}) expiresAt:Date;
  @Column({name:'revoked_at',type:'datetime',nullable:true}) revokedAt:Date|null;
  @CreateDateColumn({name:'created_at',type:'datetime',precision:6}) createdAt:Date;
}
export const ENTITIES=[User,AccountType,BankAccount,BankTransfer,BankTransaction,RefreshSession];
