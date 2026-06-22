-- Extended user profile data — separated from core identity (users table)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id        UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name     VARCHAR(100),
  last_name      VARCHAR(100),
  phone          VARCHAR(20),
  gender         VARCHAR(20),
  address        TEXT,
  city           VARCHAR(100),
  state          VARCHAR(100),
  pincode        VARCHAR(20),
  country        VARCHAR(100) DEFAULT 'India',
  bank_name      VARCHAR(100),
  account_holder VARCHAR(200),
  account_number VARCHAR(50),
  ifsc           VARCHAR(20),
  pan            VARCHAR(20),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
