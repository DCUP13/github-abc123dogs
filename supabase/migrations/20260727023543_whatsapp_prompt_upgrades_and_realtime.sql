/*
  # WhatsApp: two-step prompts, company/property info, and realtime

  ## Summary
  Brings the WhatsApp AI prompt builder to parity with the email prompt builder
  by adding one-step/two-step mode, a step-2 prompt, and company-info +
  property-info fields. Also enables Supabase Realtime on the WhatsApp
  conversations and messages tables so new messages (including AI-generated
  outgoing replies) appear live in the inbox without a manual refresh.

  ## Changes

  ### Modified Table: whatsapp_prompts
  - `prompt_type` (text, NOT NULL, default 'one_step', CHECK in
    ('one_step','two_step')) — controls whether the webhook runs one or two
    AI passes. One-step behaves exactly as before.
  - `step2_content` (text, nullable) — the second prompt used only when
    prompt_type = 'two_step'. The step-1 result is injected via the
    {{step1_result}} placeholder; {{whatsapp_message}} and all other
    placeholders are also available here.
  - `company_info` (text, nullable) — free-form company details injected via
    the {{company_info}} placeholder.
  - `property_info` (jsonb, nullable) — structured property details injected
    via the {{property_info}} placeholder (array or single object, formatted
    into text by the webhook).

  ### Realtime
  - Adds `whatsapp_conversations` and `whatsapp_messages` to the
    `supabase_realtime` publication so INSERT/UPDATE events are broadcast to
    subscribed clients. Both tables already have SELECT policies for
    authenticated users, which is required for realtime access.

  ## Notes
  - No data is lost: all new columns are nullable or have safe defaults.
  - The webhook (service role) bypasses RLS, so no policy changes are needed
    for it to read the new columns.
  - The global AI on/off switch reuses the existing `whatsapp_prompts.is_active`
    column — no extra column needed. The inbox header will expose it.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_prompts' AND column_name = 'prompt_type'
  ) THEN
    ALTER TABLE whatsapp_prompts
      ADD COLUMN prompt_type text NOT NULL DEFAULT 'one_step'
      CHECK (prompt_type IN ('one_step', 'two_step'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_prompts' AND column_name = 'step2_content'
  ) THEN
    ALTER TABLE whatsapp_prompts ADD COLUMN step2_content text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_prompts' AND column_name = 'company_info'
  ) THEN
    ALTER TABLE whatsapp_prompts ADD COLUMN company_info text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_prompts' AND column_name = 'property_info'
  ) THEN
    ALTER TABLE whatsapp_prompts ADD COLUMN property_info jsonb DEFAULT NULL;
  END IF;
END $$;

-- Enable realtime on WhatsApp tables so the inbox gets live updates.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversations;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
  END IF;
END $$;
