/*
  # Add domain selection to prompts

  1. New Tables
    - `prompt_domains`
      - `id` (uuid, primary key)
      - `prompt_id` (uuid, foreign key to prompts)
      - `domain` (text)
      - `user_id` (uuid, foreign key to profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `prompt_domains` table
    - Add policies for authenticated users to manage their own prompt domains

  3. Changes
    - Create junction table to link prompts with multiple domains
    - Add indexes for performance
*/

CREATE TABLE IF NOT EXISTS prompt_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  domain text NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prompt_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own prompt domains"
  ON prompt_domains
  FOR SELECT
  TO authenticated
  USING (uid() = user_id);

CREATE POLICY "Users can insert own prompt domains"
  ON prompt_domains
  FOR INSERT
  TO authenticated
  WITH CHECK (uid() = user_id);

CREATE POLICY "Users can update own prompt domains"
  ON prompt_domains
  FOR UPDATE
  TO authenticated
  USING (uid() = user_id)
  WITH CHECK (uid() = user_id);

CREATE POLICY "Users can delete own prompt domains"
  ON prompt_domains
  FOR DELETE
  TO authenticated
  USING (uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompt_domains_prompt_id ON prompt_domains(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_domains_user_id ON prompt_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_domains_domain ON prompt_domains(domain);

-- Add unique constraint to prevent duplicate domain assignments per prompt
ALTER TABLE prompt_domains ADD CONSTRAINT unique_prompt_domain 
  UNIQUE (prompt_id, domain);