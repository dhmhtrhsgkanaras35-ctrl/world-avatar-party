-- Add pose field to profiles table for future animation support
ALTER TABLE public.profiles 
ADD COLUMN pose TEXT DEFAULT 'idle' CHECK (pose IN ('idle', 'walking', 'waving', 'cheering'));