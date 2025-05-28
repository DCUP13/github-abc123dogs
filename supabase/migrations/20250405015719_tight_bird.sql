/*
  # Add daily limits to email tables

  1. Changes
    - Add daily_limit column to amazon_ses_emails table
    - Add daily_limit column to google_smtp_emails table
    - Remove sending_rate from campaign_emails table
    - Update documentation and constraints

  2. Security
    - Maintain existing RLS policies
*/

-- Add daily_limit to amazon_ses_emails
ALTER TABLE amazon_ses_emails 
ADD COLUMN daily_limit integer NOT NULL DEFAULT 1440
CHECK (daily_limit > 0 AND daily_limit <= 50000);

-- Add daily_limit to google_smtp_emails
ALTER TABLE google_smtp_emails 
ADD COLUMN daily_limit integer NOT NULL DEFAULT 500
CHECK (daily_limit > 0 AND daily_limit <= 500);

-- Remove sending_rate from campaign_emails
ALTER TABLE campaign_emails 
DROP COLUMN sending_rate;

-- Add documentation
COMMENT ON COLUMN amazon_ses_emails.daily_limit IS 'Maximum number of emails that can be sent per day (1-50000)';
COMMENT ON COLUMN google_smtp_emails.daily_limit IS 'Maximum number of emails that can be sent per day (1-500)';