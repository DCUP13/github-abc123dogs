-- Add user_id column to campaign_emails table
ALTER TABLE public.campaign_emails
ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add user_id column to campaign_templates table
ALTER TABLE public.campaign_templates
ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update existing campaign_emails with user_id from campaigns table
UPDATE campaign_emails ce
SET user_id = c.user_id
FROM campaigns c
WHERE ce.campaign_id = c.id;

-- Update existing campaign_templates with user_id from campaigns table
UPDATE campaign_templates ct
SET user_id = c.user_id
FROM campaigns c
WHERE ct.campaign_id = c.id;

-- Make user_id NOT NULL after populating data
ALTER TABLE campaign_emails
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE campaign_templates
ALTER COLUMN user_id SET NOT NULL;

-- Add indexes for better query performance
CREATE INDEX idx_campaign_emails_user_id ON campaign_emails(user_id);
CREATE INDEX idx_campaign_templates_user_id ON campaign_templates(user_id);

-- Update RLS policies for campaign_emails
DROP POLICY IF EXISTS "Users can read own campaign emails" ON campaign_emails;
CREATE POLICY "Users can read own campaign emails"
ON campaign_emails FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own campaign emails" ON campaign_emails;
CREATE POLICY "Users can insert own campaign emails"
ON campaign_emails FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own campaign emails" ON campaign_emails;
CREATE POLICY "Users can update own campaign emails"
ON campaign_emails FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own campaign emails" ON campaign_emails;
CREATE POLICY "Users can delete own campaign emails"
ON campaign_emails FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Update RLS policies for campaign_templates
DROP POLICY IF EXISTS "Users can read own campaign templates" ON campaign_templates;
CREATE POLICY "Users can read own campaign templates"
ON campaign_templates FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own campaign templates" ON campaign_templates;
CREATE POLICY "Users can insert own campaign templates"
ON campaign_templates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own campaign templates" ON campaign_templates;
CREATE POLICY "Users can delete own campaign templates"
ON campaign_templates FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create trigger function to automatically set user_id
CREATE OR REPLACE FUNCTION set_campaign_user_id()
RETURNS trigger AS $$
BEGIN
  SELECT user_id INTO NEW.user_id
  FROM campaigns
  WHERE id = NEW.campaign_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically set user_id
CREATE TRIGGER set_campaign_emails_user_id
BEFORE INSERT ON campaign_emails
FOR EACH ROW
EXECUTE FUNCTION set_campaign_user_id();

CREATE TRIGGER set_campaign_templates_user_id
BEFORE INSERT ON campaign_templates
FOR EACH ROW
EXECUTE FUNCTION set_campaign_user_id();