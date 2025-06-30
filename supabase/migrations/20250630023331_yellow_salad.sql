/*
  # Add sender fields to campaigns table

  1. Changes
    - Add sender_phone column to campaigns table
    - Add sender_city column to campaigns table
    - Add sender_state column to campaigns table
    - Add sender_name column to campaigns table
    - Add emd column to campaigns table
    - Add option_period column to campaigns table

  2. Documentation
    - All new columns are text type with default empty string
    - These fields store sender information and transaction details for campaigns
*/

-- Add sender fields to campaigns table
ALTER TABLE campaigns 
ADD COLUMN sender_phone text NOT NULL DEFAULT '',
ADD COLUMN sender_city text NOT NULL DEFAULT '',
ADD COLUMN sender_state text NOT NULL DEFAULT '',
ADD COLUMN sender_name text NOT NULL DEFAULT '',
ADD COLUMN emd text NOT NULL DEFAULT '',
ADD COLUMN option_period text NOT NULL DEFAULT '';

-- Add documentation
COMMENT ON COLUMN campaigns.sender_phone IS 'Phone number of the sender';
COMMENT ON COLUMN campaigns.sender_city IS 'City where the sender is located';
COMMENT ON COLUMN campaigns.sender_state IS 'State where the sender is located';
COMMENT ON COLUMN campaigns.sender_name IS 'Name of the sender';
COMMENT ON COLUMN campaigns.emd IS 'Earnest Money Deposit amount';
COMMENT ON COLUMN campaigns.option_period IS 'Option period for the transaction';