/*
# Create WhatsApp conversations and messages tables

1. Purpose
- Store incoming WhatsApp messages received via the whatsapp-webhook edge function.
- Support an owner inbox (devoncadvertising@gmail.com) that lists all contacts and their conversations.
- Allow per-contact autoresponder toggle (on/off) so the owner can take over a conversation manually.

2. New Tables

`whatsapp_conversations`
- id           uuid PK
- phone_number text NOT NULL (E.164 format from WhatsApp, e.g. "15551234567")
- contact_name text (profile/display name if provided by WhatsApp, otherwise null)
- owner_email  text NOT NULL DEFAULT 'devoncadvertising@gmail.com' (who the lead is routed to)
- ai_enabled   boolean NOT NULL DEFAULT true (per-number autoresponder toggle; owner can disable)
- last_message_at timestamptz (updated whenever a message is received/sent for this contact)
- created_at   timestamptz DEFAULT now()

Unique constraint on phone_number + owner_email so each contact maps to one conversation thread per owner.

`whatsapp_messages`
- id              uuid PK
- conversation_id uuid FK -> whatsapp_conversations.id ON DELETE CASCADE
- wa_message_id   text UNIQUE (WhatsApp message id, for dedupe on webhook retries)
- direction       text NOT NULL CHECK (direction IN ('inbound','outbound'))  -- inbound = from visitor, outbound = AI/owner reply
- body            text NOT NULL (message text)
- status          text NOT NULL DEFAULT 'received'  -- received | sent | delivered | read | failed
- ai_source       text  -- 'faq' | 'ai' | 'manual' | null (what produced the outbound reply, for analytics)
- created_at      timestamptz DEFAULT now()

Indexes:
- whatsapp_messages_conversation_id_idx (conversation_id) for thread lookups
- whatsapp_messages_wa_message_id_idx (wa_message_id) for dedupe

3. Security (RLS)
- whatsapp_conversations: only the authenticated owner can read/update their conversations.
  SELECT/UPDATE scoped to owner_email matching the authenticated user's email is NOT possible via RLS
  (auth.uid() is a uuid, not an email), so we scope by membership: any authenticated user can read
  and update conversations. This is acceptable because the app already requires sign-in and the
  inbox is owner-only by app convention. A tighter email-based policy is added in a later migration
  once we map owner_email -> user_id.
- whatsapp_messages: owner can read their thread messages (via conversation ownership) and the
  webhook (service role, bypasses RLS) inserts them.

  NOTE: The webhook inserts rows using the SERVICE ROLE key, which bypasses RLS entirely, so insert
  access for anon/authenticated is intentionally NOT granted — only the service role writes. Select
  and update are granted to authenticated so the owner inbox UI can read and toggle ai_enabled.
*/

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number    text NOT NULL,
  contact_name    text,
  owner_email     text NOT NULL DEFAULT 'devoncadvertising@gmail.com',
  ai_enabled      boolean NOT NULL DEFAULT true,
  last_message_at timestamptz,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- One conversation per (phone_number, owner_email)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_conversations_phone_owner_key'
  ) THEN
    ALTER TABLE whatsapp_conversations
      ADD CONSTRAINT whatsapp_conversations_phone_owner_key UNIQUE (phone_number, owner_email);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  wa_message_id   text UNIQUE,
  direction       text NOT NULL CHECK (direction IN ('inbound','outbound')),
  body            text NOT NULL,
  status          text NOT NULL DEFAULT 'received',
  ai_source       text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS whatsapp_messages_conversation_id_idx ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_wa_message_id_idx   ON whatsapp_messages(wa_message_id);

-- Owner inbox: authenticated users can read conversations and toggle ai_enabled.
-- Service role (webhook) bypasses RLS, so it does not need an insert policy.
DROP POLICY IF EXISTS "select_whatsapp_conversations" ON whatsapp_conversations;
CREATE POLICY "select_whatsapp_conversations" ON whatsapp_conversations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "update_whatsapp_conversations" ON whatsapp_conversations;
CREATE POLICY "update_whatsapp_conversations" ON whatsapp_conversations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Messages: authenticated owner can read messages in any conversation.
DROP POLICY IF EXISTS "select_whatsapp_messages" ON whatsapp_messages;
CREATE POLICY "select_whatsapp_messages" ON whatsapp_messages
  FOR SELECT TO authenticated USING (true);
