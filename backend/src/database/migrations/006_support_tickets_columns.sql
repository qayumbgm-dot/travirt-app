-- support_tickets: add message body and category columns
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS message  TEXT,
  ADD COLUMN IF NOT EXISTS category VARCHAR(100) NOT NULL DEFAULT 'General';
