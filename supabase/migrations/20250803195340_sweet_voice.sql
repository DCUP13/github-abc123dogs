/*
  # Create emails table for storing received emails

  1. New Tables
    - `emails`
      - `id` (uuid, primary key) - Unique identifier for each email
      - `sender` (text, not null) - Email address of the sender
      - `subject` (text) - Subject line of the email
      - `body` (text) - Email body content
      - `attachments` (jsonb) - JSON array of attachment information
      - `zip_code` (text) - ZIP code extracted from email content
      - `created_at` (timestamp with time zone) - When the email was received

  2. Security
    - Enable RLS on `emails` table
    - Add policy for authenticated users to insert emails
    - Add policy for authenticated users to read emails
*/

CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  attachments JSONB,
  zip_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row-Level Security (RLS)
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow authenticated users to insert
CREATE POLICY "Allow authenticated insert" ON emails
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create a policy to allow authenticated users to read
CREATE POLICY "Allow authenticated read" ON emails
  FOR SELECT TO authenticated
  USING (true);