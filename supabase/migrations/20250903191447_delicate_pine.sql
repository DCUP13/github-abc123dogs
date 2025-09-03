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

-- Create the amazon_ses_domains table
CREATE TABLE IF NOT EXISTS amazon_ses_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  domain text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE amazon_ses_domains ENABLE ROW LEVEL SECURITY;

-- Add unique constraint for user_id + domain combination
ALTER TABLE amazon_ses_domains 
ADD CONSTRAINT amazon_ses_domains_user_id_domain_key UNIQUE (user_id, domain);

-- Add foreign key constraint
ALTER TABLE amazon_ses_domains 
ADD CONSTRAINT amazon_ses_domains_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Create policies for RLS
CREATE POLICY "Users can insert own domains"
  ON amazon_ses_domains
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own domains"
  ON amazon_ses_domains
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own domains"
  ON amazon_ses_domains
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own domains"
  ON amazon_ses_domains
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE amazon_ses_domains;