/*
  # Create event notifications table

  1. New Tables
    - `event_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `integration_id` (uuid, references integrations)
      - `event_type` (text) - Type of event (new_email, new_contact, meeting_scheduled, etc.)
      - `channel` (text) - Slack channel to send notification to
      - `message` (text) - Custom message template for this event
      - `username` (text) - Bot display name for this notification
      - `is_active` (boolean) - Whether this event notification is enabled
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `event_notifications` table
    - Add policies for authenticated users to manage their own event notifications

  3. Indexes
    - Index on user_id for faster queries
    - Index on integration_id for faster queries
    - Index on event_type for faster queries
*/

CREATE TABLE IF NOT EXISTS event_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  integration_id uuid REFERENCES integrations(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  channel text NOT NULL,
  message text NOT NULL,
  username text DEFAULT 'Bot User',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE event_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own event notifications"
  ON event_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own event notifications"
  ON event_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own event notifications"
  ON event_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own event notifications"
  ON event_notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_event_notifications_user_id ON event_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_integration_id ON event_notifications(integration_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_event_type ON event_notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_event_notifications_active ON event_notifications(is_active) WHERE is_active = true;