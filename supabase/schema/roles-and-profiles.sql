-- Create a custom enum type for user roles
CREATE TYPE user_role AS ENUM ('customer', 'provider', 'admin');

-- Create the profiles table extending auth.users
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'customer',
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- Turn on Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all profiles (or restrict to just admins and self if preferred)
-- For this marketplace, we restrict to self and admins.
CREATE POLICY "Users can view their own profile." 
  ON public.profiles FOR SELECT 
  USING ( auth.uid() = id );

CREATE POLICY "Admins can view all profiles." 
  ON public.profiles FOR SELECT 
  USING ( 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' 
  );

CREATE OR REPLACE FUNCTION public.profile_role_is_unchanged(
  profile_id UUID,
  next_role TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = profile_id
      AND profiles.id = auth.uid()
      AND profiles.role::text = next_role
  );
$$;

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = id
    AND role::text = 'customer'
  );

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile." 
  ON public.profiles FOR UPDATE 
  USING ( auth.uid() IS NOT NULL AND auth.uid() = id )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = id
    AND public.profile_role_is_unchanged(id, role::text)
  );

-- Create a trigger function to automatically create a profile for every new user
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, role)
  VALUES (NEW.id, NEW.email, NEW.phone, 'customer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
