/*
  # Create amazon_ses_domains table

  1. New Tables
    - `amazon_ses_domains`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `domain` (text, domain name)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `amazon_ses_domains` table
    - Add policies for authenticated users to manage their own domains

  3. Constraints
    - Unique constraint on user_id + domain combination
    - Foreign key constraint to profiles table
*/

CREATE TABLE IF NOT EXISTS amazon_ses_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  domain text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE amazon_ses_domains ENABLE ROW LEVEL SECURITY;

-- Add unique constraint to prevent duplicate domains per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'amazon_ses_domains' AND constraint_name = 'amazon_ses_domains_user_id_domain_key'
  ) THEN
    ALTER TABLE amazon_ses_domains ADD CONSTRAINT amazon_ses_domains_user_id_domain_key UNIQUE (user_id, domain);
  END IF;
END $$;

-- Add foreign key constraint to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'amazon_ses_domains' AND constraint_name = 'amazon_ses_domains_user_id_fkey'
  ) THEN
    ALTER TABLE amazon_ses_domains ADD CONSTRAINT amazon_ses_domains_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- RLS Policies
CREATE POLICY "Users can read own SES domains"
  ON amazon_ses_domains
  FOR SELECT
  TO authenticated
  USING (uid() = user_id);

CREATE POLICY "Users can insert own SES domains"
  ON amazon_ses_domains
  FOR INSERT
  TO authenticated
  WITH CHECK (uid() = user_id);

CREATE POLICY "Users can update own SES domains"
  ON amazon_ses_domains
  FOR UPDATE
  TO authenticated
  USING (uid() = user_id)
  WITH CHECK (uid() = user_id);

CREATE POLICY "Users can delete own SES domains"
  ON amazon_ses_domains
  FOR DELETE
  TO authenticated
  USING (uid() = user_id);

-- Enable realtime for the table
CREATE POLICY "Enable Realtime select"
  ON amazon_ses_domains
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable Realtime insert"
  ON amazon_ses_domains
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable Realtime update"
  ON amazon_ses_domains
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Enable Realtime delete"
  ON amazon_ses_domains
  FOR DELETE
  TO public
  USING (true);

CREATE POLICY "delete own settings"
  ON amazon_ses_domains
  FOR DELETE
  TO public
  USING (user_id = uid());