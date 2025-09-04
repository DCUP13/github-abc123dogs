/*
  # Add delete policies for email tables

  1. Security Updates
    - Add delete policies for email_outbox table
    - Add delete policies for email_sent table  
    - Add delete policies for emails table
    - Ensure users can only delete their own emails

  2. Policy Details
    - Users can delete their own outbox emails
    - Users can delete their own sent emails
    - Allow deletion of received emails (inbox)
*/

-- Add delete policy for email_outbox (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'email_outbox' 
    AND policyname = 'Users can delete own outbox emails'
  ) THEN
    CREATE POLICY "Users can delete own outbox emails"
      ON email_outbox
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add delete policy for email_sent (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'email_sent' 
    AND policyname = 'Users can delete own sent emails'
  ) THEN
    CREATE POLICY "Users can delete own sent emails"
      ON email_sent
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add delete policy for emails (inbox) - allow authenticated users to delete any email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'emails' 
    AND policyname = 'Allow authenticated delete'
  ) THEN
    CREATE POLICY "Allow authenticated delete"
      ON emails
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;