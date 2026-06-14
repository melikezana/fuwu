-- Add missing columns to provider_applications safely
ALTER TABLE provider_applications
ADD COLUMN IF NOT EXISTS availability text,
ADD COLUMN IF NOT EXISTS has_equipment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS introduction text,
ADD COLUMN IF NOT EXISTS portfolio_url text,
ADD COLUMN IF NOT EXISTS profile_image_path text,
ADD COLUMN IF NOT EXISTS profile_image_url text;
