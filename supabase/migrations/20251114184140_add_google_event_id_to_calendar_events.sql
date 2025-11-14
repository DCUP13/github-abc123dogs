/*
  # Add Google Event ID for sync deduplication

  1. Changes
    - Add `google_event_id` column to `calendar_events` table
    - Add unique constraint on (user_id, google_event_id) to prevent duplicates
    - This allows proper upsert behavior when syncing from Google Calendar

  2. Notes
    - Existing events will have NULL google_event_id (manually created events)
    - Only synced events from Google will have this ID populated
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' AND column_name = 'google_event_id'
  ) THEN
    ALTER TABLE calendar_events 
    ADD COLUMN google_event_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'calendar_events_user_id_google_event_id_key'
  ) THEN
    ALTER TABLE calendar_events 
    ADD CONSTRAINT calendar_events_user_id_google_event_id_key 
    UNIQUE (user_id, google_event_id);
  END IF;
END $$;