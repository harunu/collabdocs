-- Run this in Supabase SQL Editor to fix the "Database error saving new user" 500 error.
-- The SECURITY DEFINER function needs SET search_path = public to find the workspaces table.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workspaces (owner_id, name)
  VALUES (NEW.id, 'My Workspace');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
