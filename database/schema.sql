CREATE DATABASE IF NOT EXISTS bank_management CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE bank_management;

CREATE TABLE IF NOT EXISTS users (
  user_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS account_types (
  account_type_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type_name VARCHAR(50) NOT NULL UNIQUE,
  minimum_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00 CHECK (minimum_balance >= 0),
  interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (interest_rate >= 0 AND interest_rate <= 100)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS accounts (
  account_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  account_type_id INT NOT NULL,
  account_number VARCHAR(20) NOT NULL UNIQUE,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  opened_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_account_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_account_type FOREIGN KEY (account_type_id) REFERENCES account_types(account_type_id) ON DELETE RESTRICT,
  INDEX idx_account_owner_status (user_id,status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transfers (
  transfer_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  source_account_id INT NOT NULL,
  destination_account_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  status ENUM('Completed') NOT NULL DEFAULT 'Completed',
  transferred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_transfer_source FOREIGN KEY (source_account_id) REFERENCES accounts(account_id) ON DELETE RESTRICT,
  CONSTRAINT fk_transfer_destination FOREIGN KEY (destination_account_id) REFERENCES accounts(account_id) ON DELETE RESTRICT,
  CONSTRAINT chk_transfer_different_accounts CHECK (source_account_id <> destination_account_id),
  INDEX idx_transfer_source (source_account_id,transferred_at),
  INDEX idx_transfer_destination (destination_account_id,transferred_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  transfer_id INT NULL,
  transaction_type ENUM('Deposit','Withdrawal','TransferIn','TransferOut') NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  description VARCHAR(255) NULL,
  transaction_date DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_transaction_account FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE RESTRICT,
  CONSTRAINT fk_transaction_transfer FOREIGN KEY (transfer_id) REFERENCES transfers(transfer_id) ON DELETE RESTRICT,
  INDEX idx_transaction_account_date (account_id,transaction_date),
  INDEX idx_transaction_transfer (transfer_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refresh_sessions (
  session_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_session_user_active (user_id,revoked_at,expires_at)
) ENGINE=InnoDB;
