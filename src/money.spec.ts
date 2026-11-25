import { HttpException } from '@nestjs/common';
import { calculateBalance,cents,money,MAX_CENTS } from './money';

describe('money helpers',()=>{
  it('converts decimal strings to exact cents',()=>{
    expect(cents('0.01')).toBe(1n);
    expect(cents('250.7')).toBe(25070n);
    expect(cents('1234567890123.99')).toBe(123456789012399n);
    expect(cents('9999999999999.99')).toBe(MAX_CENTS);
  });

  it('rejects negative values and more than two decimal places',()=>{
    for(const value of ['-1.00','1.001','1,000.00','1e3']) expect(()=>cents(value)).toThrow(HttpException);
  });

  it('formats exact cents without floating point',()=>{
    expect(money(1n)).toBe('0.01');
    expect(money(12345n)).toBe('123.45');
  });

  it('allows credits and preserves the minimum balance on debits',()=>{
    expect(calculateBalance('0.00','1000.00','credit','500.00')).toBe('1000.00');
    expect(calculateBalance('0.00','100.00','credit','500.00')).toBe('100.00');
    expect(calculateBalance('1000.00','125.50','debit','500.00')).toBe('874.50');
    expect(()=>calculateBalance('1000.00','500.01','debit','500.00')).toThrow(HttpException);
  });

  it('rejects a zero value and balance overflow',()=>{
    expect(()=>calculateBalance('100.00','0','credit')).toThrow(HttpException);
    expect(()=>calculateBalance('9999999999999.99','0.01','credit')).toThrow(HttpException);
  });
});
