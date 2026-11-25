# Bank Account and Transaction Management System: demo outline

Suggested 10–15 minute presentation.

## 1. Goal and users (1 minute)

Explain the need to manage customer accounts, balances, deposits, withdrawals and transfers without slow manual processing. Identify customers and administrators.

## 2. Architecture and data model (2–3 minutes)

Trace client → API → JWT/role/ownership checks → account rules → MySQL. Use the ERD to explain User-to-Account, AccountType-to-Account and Account-to-Transaction links, plus transfers between two accounts.

## 3. Security and API (2 minutes)

Show the `/api/v1` resources, bcrypt password hashes, 15-minute access JWT, rotating hashed refresh token, role checks and per-account ownership checks. Explain 401 versus 403. Note that balances and owner IDs cannot be directly changed through account PATCH.

## 4. Postman demonstration (5–7 minutes)

1. Log in as the seeded admin and show Users/Account Types/Accounts lists.
2. Log in as the seeded customer and list only that customer's accounts.
3. Post a deposit, then fetch the account and transaction history to show the balance and ledger update.
4. Post a withdrawal within the minimum balance and read the resulting ledger row.
5. Transfer between the customer's two accounts; show the transfer plus matching TransferOut and TransferIn transactions.
6. Try an over-limit withdrawal to show 422 and confirm balance unchanged.
7. Try reading the recipient's account with the customer token to show 403.
8. Refresh the token once to demonstrate rotation; reusing the old refresh token should return 401.

Never show `.env` passwords in a recording. Use only the fictional seeded records and local values.

## 5. Wrap-up (1 minute)

Emphasize atomic balance changes, ownership enforcement and audit records. State the next steps: MFA, durable shared login throttling, production migrations, formal tests and security review. The demo does not connect to a real bank.
