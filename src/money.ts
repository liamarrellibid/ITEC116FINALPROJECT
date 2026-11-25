import { BadRequestException,UnprocessableEntityException } from '@nestjs/common';

export const MONEY=/^\d{1,13}(?:\.\d{1,2})?$/;
export const MAX_CENTS=999999999999999n;

export function cents(value:string|number):bigint {
  const text=String(value);
  if(!MONEY.test(text))throw new BadRequestException('Amount must be positive with at most two decimal places.');
  const [whole,fraction='']=text.split('.');
  return BigInt(whole)*100n+BigInt((fraction+'00').slice(0,2));
}

export function money(value:bigint):string {
  if(value<0n||value>MAX_CENTS)throw new RangeError('Money value is outside the supported DECIMAL(15,2) range.');
  return `${value/100n}.${String(value%100n).padStart(2,'0')}`;
}

export function calculateBalance(balance:string,amount:string|number,direction:'credit'|'debit',minimumBalance='0.00'):string {
  const current=cents(balance),amountCents=cents(amount),minimum=cents(minimumBalance);
  if(amountCents<=0n)throw new BadRequestException('Amount must be greater than zero.');
  const next=direction==='credit'?current+amountCents:current-amountCents;
  if(direction==='debit'&&next<minimum)throw new UnprocessableEntityException('Insufficient available funds or minimum balance would be violated.');
  if(next>MAX_CENTS)throw new UnprocessableEntityException('Account balance limit exceeded.');
  return money(next);
}
