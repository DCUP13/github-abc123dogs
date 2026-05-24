/*
  # Add Two-Step Prompt Support

  ## Summary
  Adds support for one-step and two-step AI prompt processing on the prompts table.

  ## Changes

  ### Modified Tables
  - `prompts`
    - `prompt_type` (text): Either 'one_step' (default) or 'two_step'. Controls how the autoresponder calls the AI.
    - `step2_content` (text, nullable): The second prompt used only when prompt_type = 'two_step'.
      Step 1 result is injected via {{step1_result}} placeholder. {{email_content}} is also available here.

  ### New Tables
  - `prompt_step_results`
    - Stores the intermediate AI output from step 1 of a two-step prompt run.
    - Linked to the email that triggered the run and the prompt that produced it.
    - Used by the autoresponder to feed the step 1 result into step 2.
    - Has RLS enabled so only the owning user can access their results.

  ## Notes
  - One-step prompts behave exactly as before.
  - Two-step prompts: step 1 uses `content` + {{email_content}}, result saved to prompt_step_results,
    then step 2 uses `step2_content` + {{email_content}} + {{step1_result}}.
  - The final output (step 2 for two-step, step 1 for one-step) is what gets sent/saved as draft.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompts' AND column_name = 'prompt_type'
  ) THEN
    ALTER TABLE prompts ADD COLUMN prompt_type text NOT NULL DEFAULT 'one_step'
      CHECK (prompt_type IN ('one_step', 'two_step'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompts' AND column_name = 'step2_content'
  ) THEN
    ALTER TABLE prompts ADD COLUMN step2_content text;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS prompt_step_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  prompt_id uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  email_id uuid NOT NULL,
  step1_result text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prompt_step_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own step results"
  ON prompt_step_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own step results"
  ON prompt_step_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own step results"
  ON prompt_step_results FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
