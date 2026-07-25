/*
# Create shared FAQ knowledge base

1. Purpose
- A single FAQ knowledge base that both the WhatsApp AI auto-reply and the email
  autoresponder check BEFORE calling the full AI model. Matching a saved FAQ
  saves processing cost and latency, and the base grows smarter as more entries
  are added.
- Tracks how often each FAQ is used so the owner can see what is effective.

2. New Tables

`faq_entries`
- id           uuid PK
- user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
- question     text NOT NULL        -- the FAQ question / trigger phrase
- answer       text NOT NULL        -- the saved answer to return on a match
- category     text                 -- optional grouping (e.g. "Pricing", "Hours")
- is_active    boolean NOT NULL DEFAULT true  -- owner can deactivate without deleting
- match_count  integer NOT NULL DEFAULT 0     -- incremented each time the AI uses this FAQ
- created_at   timestamptz DEFAULT now()
- updated_at   timestamptz DEFAULT now()

Indexes:
- faq_entries_user_id_idx (user_id) for per-user lookups
- faq_entries_category_idx (category) for filtering

3. Security (RLS)
- Owner-scoped: each authenticated user can CRUD only their own FAQ entries.
- user_id defaults to auth.uid() so inserts that omit user_id still satisfy policy.
- The autoresponder and whatsapp-webhook edge functions use the SERVICE ROLE key,
  which bypasses RLS, so they can read faq_entries and increment match_count
  without needing anon policies.
*/

CREATE TABLE IF NOT EXISTS faq_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question     text NOT NULL,
  answer       text NOT NULL,
  category     text,
  is_active    boolean NOT NULL DEFAULT true,
  match_count  integer NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE faq_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS faq_entries_user_id_idx ON faq_entries(user_id);
CREATE INDEX IF NOT EXISTS faq_entries_category_idx ON faq_entries(category);

DROP POLICY IF EXISTS "select_own_faq_entries" ON faq_entries;
CREATE POLICY "select_own_faq_entries" ON faq_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_faq_entries" ON faq_entries;
CREATE POLICY "insert_own_faq_entries" ON faq_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_faq_entries" ON faq_entries;
CREATE POLICY "update_own_faq_entries" ON faq_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_faq_entries" ON faq_entries;
CREATE POLICY "delete_own_faq_entries" ON faq_entries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
