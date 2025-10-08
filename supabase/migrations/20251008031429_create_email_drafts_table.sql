/*
  # Create email_drafts table

  1. New Tables
    - `email_drafts`
      - `id` (uuid, primary key) - Unique identifier for each draft
      - `user_id` (uuid, not null) - Foreign key to auth.users
      - `sender` (text, not null) - Email address of the sender
      - `receiver` (text array) - Array of recipient email addresses
      - `subject` (text) - Subject line of the draft email
      - `body` (text) - Draft email body content
      - `attachments` (jsonb) - JSON array of attachment information
      - `created_at` (timestamp with time zone) - When the draft was created
      - `updated_at` (timestamp with time zone) - When the draft was last modified

  2. Security
    - Enable RLS on `email_drafts` table
    - Add policy for authenticated users to manage their own drafts
    - Users can only access drafts they created
*/

CREATE TABLE IF NOT EXISTS email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender text NOT NULL,
  receiver text[],
  subject text,
  body text,
  attachments jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drafts"
  ON email_drafts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts"
  ON email_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts"
  ON email_drafts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts"
  ON email_drafts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_email_drafts_user_id ON email_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_created_at ON email_drafts(created_at DESC);