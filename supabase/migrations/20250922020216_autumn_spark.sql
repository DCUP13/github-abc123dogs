/*
  # Fix User Profile Creation

  1. Database Functions
    - Update handle_new_user function to properly create profiles
    - Ensure proper error handling and logging

  2. Triggers
    - Verify trigger is properly set up on auth.users table
    - Add fallback profile creation logic

  3. Security
    - Maintain existing RLS policies
    - Ensure proper user isolation
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new profile with proper error handling
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  );
  
  -- Create default user settings
  INSERT INTO public.user_settings (
    user_id,
    notifications,
    dark_mode,
    two_factor_auth,
    newsletter,
    public_profile,
    debugging,
    clean_up_loi,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    true,
    false,
    false,
    false,
    true,
    false,
    false,
    NOW(),
    NOW()
  );
  
  -- Create default dashboard statistics
  INSERT INTO public.dashboard_statistics (
    user_id,
    total_emails_remaining,
    total_email_accounts,
    total_emails_sent_today,
    total_templates,
    total_campaigns,
    total_domains,
    updated_at
  )
  VALUES (
    NEW.id,
    0,
    0,
    0,
    0,
    0,
    0,
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create a function to manually create missing profiles for existing users
CREATE OR REPLACE FUNCTION create_missing_profiles()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find users without profiles
  FOR user_record IN 
    SELECT au.id, au.email, au.created_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    -- Create missing profile
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (
      user_record.id,
      user_record.email,
      user_record.created_at,
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create missing user settings
    INSERT INTO public.user_settings (
      user_id,
      notifications,
      dark_mode,
      two_factor_auth,
      newsletter,
      public_profile,
      debugging,
      clean_up_loi,
      created_at,
      updated_at
    )
    VALUES (
      user_record.id,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      user_record.created_at,
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create missing dashboard statistics
    INSERT INTO public.dashboard_statistics (
      user_id,
      total_emails_remaining,
      total_email_accounts,
      total_emails_sent_today,
      total_templates,
      total_campaigns,
      total_domains,
      updated_at
    )
    VALUES (
      user_record.id,
      0,
      0,
      0,
      0,
      0,
      0,
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Created missing profile for user: %', user_record.email;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to create missing profiles
SELECT create_missing_profiles();

-- Drop the temporary function
DROP FUNCTION create_missing_profiles();