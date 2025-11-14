/*
  # Create google_calendar_tokens table

  1. New Tables
    - `google_calendar_tokens`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, not null) - Foreign key to auth.users
      - `access_token` (text, not null) - Google OAuth access token
      - `refresh_token` (text) - Google OAuth refresh token
      - `token_expiry` (timestamptz) - When the access token expires
      - `calendar_id` (text) - Google Calendar ID (usually primary)
      - `last_sync` (timestamptz) - Last successful sync timestamp
      - `created_at` (timestamptz) - When the token was created
      - `updated_at` (timestamptz) - When the token was last updated

  2. Security
    - Enable RLS on `google_calendar_tokens` table
    - Add policies for authenticated users to manage their own tokens
    - Users can only access their own Google Calendar credentials

  3. Indexes
    - Index on user_id for efficient querying
    - Unique constraint on user_id (one Google Calendar connection per user)

  4. Notes
    - Tokens should be encrypted in production
    - Refresh token is optional (used to get new access tokens)
    - Token expiry helps determine when to refresh
*/

CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  token_expiry timestamptz,
  calendar_id text,
  last_sync timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own Google Calendar tokens"
  ON google_calendar_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Google Calendar tokens"
  ON google_calendar_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Google Calendar tokens"
  ON google_calendar_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own Google Calendar tokens"
  ON google_calendar_tokens
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id);
