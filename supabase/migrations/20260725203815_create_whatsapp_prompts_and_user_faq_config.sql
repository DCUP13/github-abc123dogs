/*
# Create WhatsApp prompts table + FAQ placeholder support

1. Purpose
- Adds a dedicated, simpler prompt store for WhatsApp AI auto-replies. WhatsApp
  prompts are separate from email prompts (kept in the `prompts` table) per the
  owner's decision to keep each channel's AI behavior distinct.
- WhatsApp prompts support the same {{faq_knowledge_base}} placeholder used by
  email prompts so the shared FAQ knowledge base can be injected into WhatsApp
  replies. The owner writes the instructions for how to use the FAQs directly in
  the prompt text.

2. New Table: whatsapp_prompts
- id           uuid PK
- user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
- title        text NOT NULL DEFAULT 'WhatsApp Reply Prompt'
- content      text NOT NULL  -- the prompt text; supports placeholders:
                                --   {{whatsapp_message}} (latest inbound text)
                                --   {{conversation_history}} (recent thread)
                                --   {{contact_name}} (contact display name or phone)
                                --   {{faq_knowledge_base}} (active FAQs for this user)
- is_active    boolean NOT NULL DEFAULT true  -- master on/off for WhatsApp AI replies
- created_at   timestamptz DEFAULT now()
- updated_at   timestamptz DEFAULT now()
- UNIQUE(user_id) — one active prompt definition per owner (multiple rows are
  allowed historically, but the webhook uses the most recent active one).

Indexes:
- whatsapp_prompts_user_id_idx (user_id) for per-owner lookup

3. Security (RLS)
- Owner-scoped: each authenticated user can CRUD only their own WhatsApp prompt.
- user_id defaults to auth.uid() so inserts that omit user_id still satisfy policy.
- The whatsapp-webhook edge function uses the SERVICE ROLE key, which bypasses
  RLS, so it can read the prompt without needing anon policies.

4. Notes
- This migration does NOT alter the existing `prompts` (email) or `faq_entries`
  tables — the FAQ placeholder is handled entirely in edge-function code by
  fetching faq_entries and substituting the placeholder string. No schema change
  is needed there.
*/

CREATE TABLE IF NOT EXISTS whatsapp_prompts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL DEFAULT 'WhatsApp Reply Prompt',
  content      text NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_prompts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS whatsapp_prompts_user_id_idx ON whatsapp_prompts(user_id);

DROP POLICY IF EXISTS "select_own_whatsapp_prompts" ON whatsapp_prompts;
CREATE POLICY "select_own_whatsapp_prompts" ON whatsapp_prompts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_whatsapp_prompts" ON whatsapp_prompts;
CREATE POLICY "insert_own_whatsapp_prompts" ON whatsapp_prompts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_whatsapp_prompts" ON whatsapp_prompts;
CREATE POLICY "update_own_whatsapp_prompts" ON whatsapp_prompts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_whatsapp_prompts" ON whatsapp_prompts;
CREATE POLICY "delete_own_whatsapp_prompts" ON whatsapp_prompts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
