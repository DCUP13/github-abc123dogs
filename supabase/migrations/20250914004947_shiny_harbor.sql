/*
  # Fix prompt domains relationship

  1. Schema Updates
    - Add foreign key constraint between prompt_domains and prompts tables
    - Ensure proper cascade deletion when prompts are deleted
  
  2. Security
    - Enable RLS on prompt_domains table
    - Add policies for authenticated users to manage their own prompt domains
*/

-- Add foreign key constraint to establish relationship
ALTER TABLE public.prompt_domains
ADD CONSTRAINT fk_prompt_domains_prompt_id
FOREIGN KEY (prompt_id)
REFERENCES public.prompts(id)
ON DELETE CASCADE;

-- Add foreign key constraint for user relationship
ALTER TABLE public.prompt_domains
ADD CONSTRAINT fk_prompt_domains_user_id
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Enable RLS on prompt_domains table
ALTER TABLE public.prompt_domains ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for prompt_domains
CREATE POLICY "Users can read own prompt domains"
  ON public.prompt_domains
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompt domains"
  ON public.prompt_domains
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompt domains"
  ON public.prompt_domains
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompt domains"
  ON public.prompt_domains
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);