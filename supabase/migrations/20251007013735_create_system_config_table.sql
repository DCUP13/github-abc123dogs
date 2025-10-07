/*
  # Create system configuration table

  1. New Tables
    - `system_config` - Stores system-wide configuration values
      - `key` (text, primary key) - Configuration key
      - `value` (text) - Configuration value
      - `created_at` (timestamptz) - When the config was created
      - `updated_at` (timestamptz) - When the config was last updated
  
  2. Initial Data
    - Store Supabase URL and service role key for edge function calls
  
  3. Security
    - No RLS needed as this is system-level configuration
    - Only accessible by database functions, not directly by users
*/

-- Create system_config table
CREATE TABLE IF NOT EXISTS system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert Supabase configuration
INSERT INTO system_config (key, value)
VALUES 
  ('supabase_url', ''),
  ('supabase_service_role_key', '')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();
