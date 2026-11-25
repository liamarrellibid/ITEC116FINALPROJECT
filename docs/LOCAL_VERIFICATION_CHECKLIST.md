# Local verification checklist

This guide tests the Lab 05 bank API resources and the Lab 06 authentication, role, ownership and transaction-security rules. Use only a dedicated local test database and the fictional seed data.

## 1. Build and unit checks

From PowerShell in the project folder:

```powershell
npm test
npm run build
```

Both commands should finish successfully. The Jest suite checks exact-cent conversion, supported money ranges, deposits/withdrawals against the minimum balance, overflow, and password rules.

## 2. Prepare an isolated MySQL database

Do not run the seed against a shared, production, or valuable database. If `bank_management` already contains data, create a separate database named `bank_management_liam_test`. In a copy of `database/schema.sql`, change both the `CREATE DATABASE` and `USE` names to `bank_management_liam_test`, then execute that copy in MySQL Workbench. Set `DB_NAME=bank_management_liam_test` in the project's local `.env`, along with credentials for that local database.

If the project already has a `.env`, preserve its secrets. Do not paste `.env` contents into chat, screenshots, GitHub, or Postman documentation. Set unique seed passwords that pass the documented password policy. Then run:

```powershell
npm run seed
npm run start:dev
```

Leave the server window running. The API should listen at `http://localhost:3000/api/v1` unless `PORT` or `API_PREFIX` was changed.

## 3. Import and configure Postman

Import these two files into Postman:

- `postman/Bank_Account_Transaction.postman_collection.json`
- `postman/Bank_Local.postman_environment.json`

Select **Bank Local (replace passwords)** and set the admin/customer passwords from the private local setup. Keep `baseUrl` at `http://localhost:3000/api/v1` unless the server uses another local port. Do not run the entire collection in one pass: choose the Admin login before admin requests, then the Customer login before customer requests. The collection changes the active token when a login request succeeds.

## 4. Admin and account-type checks

1. Send **Login (Admin)**; expect 200 and saved `accessToken`/`refreshToken` variables.
2. Send **Current profile** and **List users (Admin)**; expect 200 and no password hashes in responses.
3. Send **Create user (Admin)** with a unique email, then **Update user role or active status**; expect 201 then 200.
4. Send **List account types**, then **Create account type (Admin)**. The sample account type has a 100.00 minimum balance. Update it and confirm the returned rate.
5. Send **List accounts (Admin captures sample IDs)** before switching to the Customer token. In a fresh seeded database, this stores the two customer account IDs and the recipient account ID for later ownership checks.

## 5. Customer account and ledger checks

1. Send **Login (Customer)** and **Current profile**; expect 200.
2. Send **List my accounts (Customer)**. It should show only the signed-in customer's two accounts. Use **Get account** for one of those IDs.
3. Send **Create account for signed-in user** using the new 100.00-minimum account type. It returns a new account ID in `newAccountId`; the owner is taken from the token.
4. Send **Deposit funds** to `newAccountId` for 250.75. Expect 201. Send **Get account** using that ID and verify the balance. Then send **List transactions** and **Account transaction history** for the same account.
5. Send **Withdraw funds** for 50.00. Expect 201 and a 200.75 balance.
6. Send **Expected 422 - withdrawal breaks account minimum** for 200.00. Expect 422. Re-read the account; its balance should remain 200.75.
7. Send **Expected 400 - account balance cannot be patched**. The API must reject a client attempt to supply `balance` directly.

## 6. Fund transfer and ownership checks

1. Before transferring, send **List my accounts (Customer)** and note the two sample balances.
2. Send **Transfer between my accounts** for 125.50. Expect 201 with status `Completed`.
3. Re-read both accounts. In the fresh seed, Savings should go from 5000.00 to 4874.50 and Checking from 2500.00 to 2625.50. The amounts must change together.
4. Send **List transfers**, **Get transfer**, **List transactions**, and the nested account transaction history. Confirm a transfer and matching `TransferOut`/`TransferIn` ledger rows exist.
5. With the Customer token still active, send **Expected 403 - customer reads a different customer account**. It should return 403.
6. Send **Expected 403 - customer cannot create an account type**. It should return 403.

## 7. Authentication and error scenarios

- **Expected 401 - protected request without token**: 401.
- **Expected 409 - duplicate registration**: 409, with a general duplicate-email response.
- **Expected 422 - withdrawal exceeds funds**: 422; re-read the account and confirm its balance did not change.
- **Refresh and rotate tokens**: 200 with a new access and refresh token. Then **Expected 401 - replay old refresh token** should return 401.
- **Logout and revoke refresh token** with the latest refresh token: 204. Reusing that refresh token should return 401.
- Request a missing account or transaction ID: 404.

The Postman request names include the expected status for these examples. Keep a copy of the initial balances if you want to repeat the transfer scenario; use a newly seeded test database for a clean run rather than manually changing database rows.

## Lab 05 endpoint coverage

The collection covers all 15 main Lab 05 operations: user list/create, account-type list/create, account list/read/create/update, nested account transactions, transaction list/create/read, and transfer list/create/read. Direct user creation is Admin-only here; public customer registration uses `/auth/register`, as specified by the Lab 06 security notes. Extra Postman requests cover account-type update/delete, account status, refresh/logout and expected 400/401/403/409/422 cases.

## Troubleshooting

- **Database connection error:** verify the local MySQL service, host/port, user privileges and dedicated `DB_NAME` in `.env`. Do not send the password to anyone.
- **JWT secret error:** replace the placeholder with a random value at least 32 characters long.
- **Seed password error:** use at least 12 characters, uppercase/lowercase letters and a number; do not reuse the email as the password.
- **401 after login:** select the Postman environment and use the matching role's Login request again.
- **403 on admin routes:** log in again as Admin; a successful Customer login deliberately replaces the active Postman token.
- **409 when deleting an account type:** this is expected when an account refers to it; use a fresh unused type to verify the 204 delete path.
- **Postman variable is blank:** run the corresponding list/create request first; its test script saves the ID.
