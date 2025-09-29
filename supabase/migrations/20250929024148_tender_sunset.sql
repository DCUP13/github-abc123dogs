/*
  # Create client grades table

  1. New Tables
    - `client_grades`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients table)
      - `user_id` (uuid, foreign key to profiles table)
      - `overall_score` (integer, 1-100)
      - `financial_score` (integer, 1-100)
      - `motivation_score` (integer, 1-100)
      - `timeline_score` (integer, 1-100)
      - `communication_score` (integer, 1-100)
      - `ai_analysis` (text, detailed AI analysis)
      - `grade_letter` (text, letter grade A+ to F)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `client_grades` table
    - Add policies for authenticated users to manage their own client grades

  3. Triggers
    - Add trigger to automatically grade new clients when created
*/

-- Create client_grades table
CREATE TABLE IF NOT EXISTS client_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  user_id uuid NOT NULL,
  overall_score integer NOT NULL CHECK (overall_score >= 1 AND overall_score <= 100),
  financial_score integer NOT NULL CHECK (financial_score >= 1 AND financial_score <= 100),
  motivation_score integer NOT NULL CHECK (motivation_score >= 1 AND motivation_score <= 100),
  timeline_score integer NOT NULL CHECK (timeline_score >= 1 AND timeline_score <= 100),
  communication_score integer NOT NULL CHECK (communication_score >= 1 AND communication_score <= 100),
  ai_analysis text NOT NULL,
  grade_letter text NOT NULL CHECK (grade_letter IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE client_grades 
ADD CONSTRAINT client_grades_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE client_grades 
ADD CONSTRAINT client_grades_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add unique constraint to ensure one grade per client
ALTER TABLE client_grades 
ADD CONSTRAINT client_grades_client_id_key 
UNIQUE (client_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_grades_user_id ON client_grades(user_id);
CREATE INDEX IF NOT EXISTS idx_client_grades_overall_score ON client_grades(overall_score);
CREATE INDEX IF NOT EXISTS idx_client_grades_grade_letter ON client_grades(grade_letter);

-- Enable Row Level Security
ALTER TABLE client_grades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read own client grades"
  ON client_grades
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own client grades"
  ON client_grades
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own client grades"
  ON client_grades
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own client grades"
  ON client_grades
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to trigger client grading
CREATE OR REPLACE FUNCTION trigger_client_grading()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the grade-client edge function asynchronously
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/grade-client',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object(
      'client_id', NEW.id,
      'user_id', NEW.user_id,
      'client_data', row_to_json(NEW)
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically grade new clients
CREATE TRIGGER on_client_created
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_client_grading();