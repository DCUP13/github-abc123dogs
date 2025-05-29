-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create initial dashboard statistics
  INSERT INTO dashboard_statistics (
    user_id,
    total_emails_remaining,
    total_email_accounts,
    total_emails_sent_today,
    total_templates
  ) VALUES (
    NEW.id,
    0,
    0,
    0,
    0
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run after profile creation
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();