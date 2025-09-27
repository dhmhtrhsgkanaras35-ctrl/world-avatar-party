-- Add avatar_id column to profiles table to store Ready Player Me avatar IDs
ALTER TABLE public.profiles 
ADD COLUMN avatar_id TEXT;