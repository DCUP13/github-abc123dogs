/*
  # Create CRM tables for client management

  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text)
      - `phone` (text)
      - `address` (text)
      - `city` (text)
      - `state` (text)
      - `zip_code` (text)
      - `client_type` (enum: buyer, seller, renter, landlord)
      - `status` (enum: lead, prospect, active, closed, inactive)
      - `budget_min` (numeric)
      - `budget_max` (numeric)
      - `preferred_areas` (text array)
      - `property_type` (text)
      - `notes` (text)
      - `source` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `client_interactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `client_id` (uuid, foreign key to clients)
      - `interaction_type` (enum: call, email, meeting, showing, text)
      - `subject` (text)
      - `notes` (text)
      - `interaction_date` (timestamp)
      - `follow_up_date` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Create enum types
CREATE TYPE client_type AS ENUM ('buyer', 'seller', 'renter', 'landlord');
CREATE TYPE client_status AS ENUM ('lead', 'prospect', 'active', 'closed', 'inactive');
CREATE TYPE interaction_type AS ENUM ('call', 'email', 'meeting', 'showing', 'text', 'note');

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  client_type client_type NOT NULL DEFAULT 'buyer',
  status client_status NOT NULL DEFAULT 'lead',
  budget_min numeric,
  budget_max numeric,
  preferred_areas text[],
  property_type text,
  notes text,
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create client_interactions table
CREATE TABLE IF NOT EXISTS client_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  interaction_type interaction_type NOT NULL,
  subject text,
  notes text,
  interaction_date timestamptz DEFAULT now(),
  follow_up_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients table
CREATE POLICY "Users can read own clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for client_interactions table
CREATE POLICY "Users can read own client interactions"
  ON client_interactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own client interactions"
  ON client_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own client interactions"
  ON client_interactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own client interactions"
  ON client_interactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_client_type ON clients(client_type);
CREATE INDEX IF NOT EXISTS idx_client_interactions_user_id ON client_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_client_interactions_client_id ON client_interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_interactions_date ON client_interactions(interaction_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_interactions_updated_at
  BEFORE UPDATE ON client_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();