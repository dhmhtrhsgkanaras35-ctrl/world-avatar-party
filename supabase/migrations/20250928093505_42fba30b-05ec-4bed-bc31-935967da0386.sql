-- Fix security vulnerability: Replace overly permissive profile visibility policy
-- First, drop all existing SELECT policies on profiles table
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own location data" ON public.profiles;

-- Create a single, properly restrictive policy that requires authentication
-- This prevents anonymous data harvesting while maintaining app functionality
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);