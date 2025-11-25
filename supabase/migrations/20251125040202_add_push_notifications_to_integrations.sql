/*
  # Add push notifications and event configuration to integrations

  1. Changes
    - Add `push_notifications_enabled` column to integrations table
    - Add `event_messages` JSONB column to store event-specific messages
    - Add index for faster queries on push_notifications_enabled

  2. Notes
    - push_notifications_enabled: Boolean toggle to enable/disable notifications
    - event_messages: JSONB object storing messages for different events like:
      {
        "new_email": "New email received from {sender}",
        "new_contact": "New contact added: {name}",
        "meeting_scheduled": "Meeting scheduled with {contact}",
        "task_completed": "Task completed: {task}",
        "draft_created": "New draft created"
      }
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integrations' AND column_name = 'push_notifications_enabled'
  ) THEN
    ALTER TABLE integrations ADD COLUMN push_notifications_enabled boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integrations' AND column_name = 'event_messages'
  ) THEN
    ALTER TABLE integrations ADD COLUMN event_messages jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_integrations_push_enabled ON integrations(push_notifications_enabled) WHERE push_notifications_enabled = true;