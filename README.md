# Bank Account and Transaction Management System

Runnable educational API starter based on the uploaded Lab 03 system architecture, Lab 04 bank entity/relationship material, Lab 05 REST API design, and Lab 06 authentication/security design.

> **Scope note:** the Lab 04 scan includes pages from an unrelated produce marketplace. The implementation ignores those pages and follows the bank entities visible in the bank ERD plus the bank API/security drafts. The API draft labels some example values provisional because the complete bank data dictionary was not included; the assumptions used here are documented in `docs/architecture-and-erd.md`.

## Included

- NestJS, TypeORM and MySQL backend with DTO validation and a consistent JSON error shape.
- Customer/admin roles, account-owner checks, bcrypt password hashes, JWT access tokens (15 minutes), hashed rotating refresh tokens (7 days), logout revocation, request throttling and a small login lockout.
- Account types, customer accounts, deposits, withdrawals, transaction history and fund transfers.
- A MySQL schema script, sample-data seeder, Postman collection/environment, ERD/architecture notes and a presentation/demo outline.

## Requirements

- Node.js 20+ and npm.
- MySQL 8.0+ (the schema uses enforced `CHECK` constraints).

## Setup

1. Run `database/schema.sql` in your MySQL client. It creates the `bank_management` database and tables.
2. If `.env` does not exist, copy `.env.example` to `.env`. Otherwise preserve the existing file and update only the settings needed for your local test database. Replace the JWT and seed-password placeholders with unique values; use passwords of at least 12 characters with uppercase, lowercase and numeric characters. Keep `.env` private; it is Git-ignored.
3. Run `npm install`.
4. Run `npm run seed` to create the admin, two sample customers, Savings and Checking types, three sample accounts and opening-balance transactions.
5. Run `npm run start:dev`. The API base is `http://localhost:3000/api/v1`.
6. Import `postman/Bank_Account_Transaction.postman_collection.json` and `postman/Bank_Local.postman_environment.json`. Set the private admin/customer passwords in the environment and run the matching **Auth / Login** request. Login saves `{{accessToken}}` and `{{refreshToken}}` automatically.

Build with `npm run build`; run the included money and password-policy unit checks with `npm test`; start with `npm run start:prod`. Follow `docs/LOCAL_VERIFICATION_CHECKLIST.md` to test the full API against a dedicated local database in Postman. Do not expose the local HTTP server publicly; put it behind HTTPS/TLS before any remote demonstration.

## API groups

All endpoints use `/api/v1`.

- Auth: register, login, refresh, logout, current profile.
- Users: admin list/create/update; public customer registration is through `/auth/register`.
- Account types: authenticated list/read, admin create/update/delete.
- Accounts: customer-owned list/read/create/update; admin can manage across customers. Clients never submit an owner ID or balance.
- Transactions: create deposit/withdrawal and read account/transaction history. The server changes the balance and ledger in one database transaction.
- Transfers: create and read transfers involving the current customer's accounts. The server locks both accounts in a stable order, checks source ownership/status/funds and destination status, then commits both balance changes, one transfer row and two matching ledger rows atomically.

See the Postman collection for 36 ready-to-import requests, `docs/LOCAL_VERIFICATION_CHECKLIST.md` for an ordered manual test, and `docs/architecture-and-erd.md` for route access rules.

## Sample local accounts

The seed command prints the admin email and lists the sample customer emails. The admin password is `SEED_ADMIN_PASSWORD`; both sample customers use the local `SEED_CUSTOMER_PASSWORD`. Accounts start with sample balances of 5000.00, 2500.00 and 1200.00. These are fictional records for local demonstration only.

## Financial and security behavior

- Amounts are validated to two decimal places and persisted as MySQL `DECIMAL`, not floating point. API responses return decimal values as strings to preserve exact cents; clients should send money values as decimal strings when precision matters.
- Withdrawals and transfers cannot lower the source below the account type's minimum balance. Insufficient funds return 422.
- Transfer posting uses a database transaction and row locks; failure rolls back both account balances and all audit rows.
- Account ownership is taken from the verified user token and checked for each account, transaction and transfer request.
- Passwords are bcrypt-hashed; access JWT payloads contain identity/role/issuer/time claims only. Refresh values are random opaque tokens whose SHA-256 hashes are stored in MySQL; refresh rotates and logout revokes the stored session.
- Login limits five failed attempts per IP/email for 15 minutes in the running process. Global throttling also limits requests. The lockout map is in-memory and resets on restart; production deployments should use a shared store such as Redis.
- Helmet sets standard security headers. Cross-origin browser requests are disabled unless you set an explicit comma-separated `CORS_ORIGIN` allowlist in `.env`.

## Known limits

- This is a classroom starter and ledger demo, not a connection to a real bank, payment rail, card network or core banking system. Never put real customer/financial data in it.
- MFA, breached-password lookup, email/SMS alerts, interest accrual, scheduled statements, dispute handling and audit administration are not integrated. MFA is a recommended next step for administrator accounts.
- Idempotency keys, fraud controls, reconciliation and a durable audit review process should be added before any real-money use.
- Database schema changes are supplied for a fresh database; there is no migration history. Review the schema and have a qualified engineer assess any real financial use.
- The included unit tests cover money parsing, balance/minimum rules, decimal overflow and password policy. Database-backed endpoint checks still need to be run manually using the dedicated test database and Postman collection.
