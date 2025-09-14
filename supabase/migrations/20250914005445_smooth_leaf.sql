/*
  # Create prompt_domains table

  1. New Tables
    - `prompt_domains`
      - `id` (uuid, primary key)
      - `prompt_id` (uuid, references prompts)
      - `domain` (text, domain name)
      - `user_id` (uuid, references profiles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `prompt_domains` table
    - Add policies for users to manage their own prompt domain associations
  
  3. Constraints
    - Unique constraint on (prompt_id, domain) to prevent duplicates
    - Foreign key constraints for data integrity
*/

CREATE TABLE IF NOT EXISTS prompt_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL,
  domain text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (prompt_id, domain)
);

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'prompt_domains_prompt_id_fkey'
  ) THEN
    ALTER TABLE prompt_domains 
    ADD CONSTRAINT prompt_domains_prompt_id_fkey 
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'prompt_domains_user_id_fkey'
  ) THEN
    ALTER TABLE prompt_domains 
    ADD CONSTRAINT prompt_domains_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE prompt_domains ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own prompt domains"
  ON prompt_domains
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompt domains"
  ON prompt_domains
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompt domains"
  ON prompt_domains
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompt domains"
  ON prompt_domains
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);