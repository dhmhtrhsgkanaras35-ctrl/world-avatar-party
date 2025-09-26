-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.blur_coordinates(lat NUMERIC, lng NUMERIC, blur_meters INTEGER DEFAULT 300)
RETURNS TABLE(blurred_lat NUMERIC, blurred_lng NUMERIC, zone_key TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.are_users_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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