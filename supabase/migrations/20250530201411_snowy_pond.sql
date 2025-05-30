-- Add debugging column to user_settings table
ALTER TABLE public.user_settings
ADD COLUMN debugging boolean NOT NULL DEFAULT false;

-- Update existing settings to have debugging disabled by default
UPDATE public.user_settings
SET debugging = false
WHERE debugging IS NULL;