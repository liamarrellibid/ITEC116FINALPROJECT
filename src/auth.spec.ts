import { validPassword } from './auth';

describe('password policy',()=>{
  it('accepts a long mixed-case password with a digit',()=>{
    expect(validPassword('SecureDemoPass2026','customer@example.test')).toBe(true);
  });

  it('rejects short, simple, common and email-matching passwords',()=>{
    expect(validPassword('Short1A','customer@example.test')).toBe(false);
    expect(validPassword('password12345','customer@example.test')).toBe(false);
    expect(validPassword('password2026','customer@example.test')).toBe(false);
    expect(validPassword('customer','customer@example.test')).toBe(false);
  });
});
