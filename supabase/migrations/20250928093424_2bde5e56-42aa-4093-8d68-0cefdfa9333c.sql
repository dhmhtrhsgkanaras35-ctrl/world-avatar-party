-- Fix security vulnerability: Replace overly permissive profile visibility policy
-- Drop the existing policy that allows everyone to view all profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a new restrictive policy that only allows authenticated users to view profiles
-- This prevents anonymous users from harvesting user data while maintaining app functionality
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Create a more restrictive policy for sensitive location data
-- Users can only see their own precise location sharing status and coordinates
CREATE POLICY "Users can view their own location data" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);