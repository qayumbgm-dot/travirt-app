-- GDPR erasure log — persists evidence that a right-to-erasure request was
-- fulfilled even after the user row (and all cascades) has been deleted.
-- Stores only the SHA-256 hash of the email, never plaintext PII.
CREATE TABLE IF NOT EXISTS gdpr_erasure_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash     VARCHAR(64) NOT NULL,    -- SHA-256 hex of the original email
  stripe_sub_id  VARCHAR(255),            -- Stripe subscription cancelled (if any)
  ip_address     VARCHAR(45),
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gdpr_erasure_email ON gdpr_erasure_log (email_hash);
CREATE INDEX IF NOT EXISTS idx_gdpr_erasure_date  ON gdpr_erasure_log (executed_at DESC);
