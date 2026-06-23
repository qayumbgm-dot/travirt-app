-- Migrate billing from Stripe to Razorpay

ALTER TABLE user_subscriptions
  RENAME COLUMN stripe_customer_id TO razorpay_customer_id;

ALTER TABLE user_subscriptions
  RENAME COLUMN stripe_subscription_id TO razorpay_subscription_id;

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);

ALTER TABLE plans
  RENAME COLUMN stripe_price_id TO razorpay_plan_id;

DROP INDEX IF EXISTS user_subscriptions_stripe_cust;
CREATE INDEX IF NOT EXISTS user_subscriptions_rzp_cust
  ON user_subscriptions(razorpay_customer_id);
