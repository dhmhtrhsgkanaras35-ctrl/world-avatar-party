-- Add location privacy and zone system to profiles
ALTER TABLE public.profiles 
ADD COLUMN location_blurred_lat NUMERIC,
ADD COLUMN location_blurred_lng NUMERIC,
ADD COLUMN zone_key TEXT,
ADD COLUMN location_sharing_enabled BOOLEAN DEFAULT false;

-- Create index for zone-based queries
CREATE INDEX idx_profiles_zone_key ON public.profiles(zone_key) WHERE zone_key IS NOT NULL;

-- Add requester_id and recipient_id columns to friendships for clearer relationships
ALTER TABLE public.friendships 
ADD COLUMN requester_id UUID,
ADD COLUMN recipient_id UUID;

-- Update existing friendships data (map user_id to requester_id and friend_id to recipient_id)
UPDATE public.friendships 
SET requester_id = user_id, recipient_id = friend_id;

-- Make the new columns NOT NULL after updating data
ALTER TABLE public.friendships 
ALTER COLUMN requester_id SET NOT NULL,
ALTER COLUMN recipient_id SET NOT NULL;

-- Create unique constraint to prevent duplicate friend requests
CREATE UNIQUE INDEX idx_friendships_unique_pair 
ON public.friendships(LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id))
WHERE status IN ('pending', 'accepted');

-- Add friend request rate limiting table
CREATE TABLE public.friend_request_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on friend_request_limits
ALTER TABLE public.friend_request_limits ENABLE ROW LEVEL SECURITY;

-- RLS policy for friend request limits
CREATE POLICY "Users can manage their own request limits" 
ON public.friend_request_limits 
FOR ALL 
USING (auth.uid() = user_id);

-- Create function to blur location coordinates
CREATE OR REPLACE FUNCTION public.blur_coordinates(lat NUMERIC, lng NUMERIC, blur_meters INTEGER DEFAULT 300)
RETURNS TABLE(blurred_lat NUMERIC, blurred_lng NUMERIC, zone_key TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  lat_offset NUMERIC;
  lng_offset NUMERIC;
  zone_lat INTEGER;
  zone_lng INTEGER;
BEGIN
  -- Calculate offset for blurring (approximate degrees per meter)
  lat_offset := blur_meters / 111000.0; -- ~111km per degree latitude
  lng_offset := blur_meters / (111000.0 * cos(radians(lat))); -- longitude varies by latitude
  
  -- Blur coordinates by rounding to grid
  blurred_lat := round(lat / lat_offset) * lat_offset;
  blurred_lng := round(lng / lng_offset) * lng_offset;
  
  -- Create zone key (300m grid)
  zone_lat := floor(lat * 111000.0 / 300);
  zone_lng := floor(lng * 111000.0 * cos(radians(lat)) / 300);
  zone_key := zone_lat::TEXT || '_' || zone_lng::TEXT;
  
  RETURN NEXT;
END;
$$;

-- Update friendships RLS policies to work with new structure
DROP POLICY IF EXISTS "Users can create friendship requests" ON public.friendships;
DROP POLICY IF EXISTS "Users can update friendships they're part of" ON public.friendships;
DROP POLICY IF EXISTS "Users can view their friendships" ON public.friendships;

CREATE POLICY "Users can create friendship requests" 
ON public.friendships 
FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships they're part of" 
ON public.friendships 
FOR UPDATE 
USING ((auth.uid() = requester_id) OR (auth.uid() = recipient_id));

CREATE POLICY "Users can view their friendships" 
ON public.friendships 
FOR SELECT 
USING ((auth.uid() = requester_id) OR (auth.uid() = recipient_id));

-- Create function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_users_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND ((requester_id = user1_id AND recipient_id = user2_id)
         OR (requester_id = user2_id AND recipient_id = user1_id))
  );
END;
$$;