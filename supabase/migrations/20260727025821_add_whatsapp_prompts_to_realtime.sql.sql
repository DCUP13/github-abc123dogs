-- Add whatsapp_prompts to the realtime publication so the inbox can subscribe
-- to changes in the global AI toggle (is_active) and prompt settings, enabling
-- live cross-window sync when the same account is open in multiple browsers.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_prompts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_prompts;
  END IF;
END $$;
