/*
  # Create calendar_events table

  1. New Tables
    - `calendar_events`
      - `id` (uuid, primary key) - Unique identifier for each event
      - `user_id` (uuid, not null) - Foreign key to auth.users
      - `title` (text, not null) - Event title
      - `description` (text) - Event description
      - `start_time` (timestamptz, not null) - Event start date and time
      - `end_time` (timestamptz, not null) - Event end date and time
      - `all_day` (boolean) - Whether the event is an all-day event
      - `location` (text) - Event location
      - `color` (text) - Event color for display
      - `created_at` (timestamptz) - When the event was created
      - `updated_at` (timestamptz) - When the event was last modified

  2. Security
    - Enable RLS on `calendar_events` table
    - Add policies for authenticated users to manage their own events
    - Users can only access events they created

  3. Indexes
    - Index on user_id for efficient querying
    - Index on start_time for date range queries
*/

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  all_day boolean DEFAULT false NOT NULL,
  location text,
  color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
