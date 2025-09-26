import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';

interface LocationToggleProps {
  user: User | null;
}

export const LocationToggle = ({ user }: LocationToggleProps) => {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'active' | 'error'>('idle');

  useEffect(() => {
    // Load sharing status from database if user is logged in
    if (user) {
      loadLocationSharingStatus();
    }

    // Cleanup on unmount
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user]);

  const loadLocationSharingStatus = async () => {
    if (!user) return;

    try {
      // Load from profiles table instead of user_locations
      const { data, error } = await supabase
        .from('profiles')
        .select('location_sharing_enabled, location_blurred_lat, location_blurred_lng')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        console.error('Error loading location status:', error);
        return;
      }

      if (data) {
        setIsSharing(data.location_sharing_enabled);
        if (data.location_blurred_lat && data.location_blurred_lng) {
          setLocation({ lat: data.location_blurred_lat, lng: data.location_blurred_lng });
        }
        if (data.location_sharing_enabled) {
          setLocationStatus('active');
          startLocationTracking();
        }
      }
    } catch (error) {
      console.error('Error loading location status:', error);
    }
  };

  const updateLocationInDatabase = async (lat: number, lng: number, sharing: boolean) => {
    if (!user) return;

    try {
      // Use the blur_coordinates function to get blurred location and zone key
      const { data: blurredData, error: blurError } = await supabase.rpc('blur_coordinates', {
        lat: lat,
        lng: lng,
        blur_meters: 300
      });

      if (blurError) {
        console.error('Error blurring coordinates:', blurError);
        return;
      }

      const blurred = blurredData[0];

      // Update both user_locations (for precise tracking) and profiles (for public/friend visibility)
      const [locationResult, profileResult] = await Promise.all([
        // Keep precise location in user_locations for internal tracking
        supabase
          .from('user_locations')
          .upsert({
            user_id: user.id,
            latitude: lat,
            longitude: lng,
            is_sharing: sharing,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          }),
        
        // Store blurred location in profiles for public visibility
        supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            location_blurred_lat: blurred.blurred_lat,
            location_blurred_lng: blurred.blurred_lng,
            zone_key: blurred.zone_key,
            location_sharing_enabled: sharing,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
      ]);

      if (locationResult.error) {
        console.error('Error updating user location:', locationResult.error);
      }

      if (profileResult.error) {
        console.error('Error updating profile location:', profileResult.error);
        toast({
          title: "Database Error",
          description: "Failed to update location in database",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support location services",
        variant: "destructive"
      });
      return;
    }

    setLocationStatus('requesting');

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000 // 30 seconds
    };

    const successCallback = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setLocation({ lat: latitude, lng: longitude });
      setLocationStatus('active');
      
      if (user && isSharing) {
        updateLocationInDatabase(latitude, longitude, true);
      }
    };

    const errorCallback = (error: GeolocationPositionError) => {
      setLocationStatus('error');
      let message = "Unknown location error";
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = "Location access denied. Please enable location permissions in your browser.";
          break;
        case error.POSITION_UNAVAILABLE:
          message = "Location information unavailable.";
          break;
        case error.TIMEOUT:
          message = "Location request timed out.";
          break;
      }
      
      toast({
        title: "Location Error",
        description: message,
        variant: "destructive"
      });
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);

    // Start watching position
    const id = navigator.geolocation.watchPosition(successCallback, errorCallback, options);
    setWatchId(id);
  };

  const stopLocationTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setLocationStatus('idle');
    
    if (user) {
      updateLocationInDatabase(location?.lat || 0, location?.lng || 0, false);
    }
  };

  const toggleLocationSharing = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to share your location",
        variant: "destructive"
      });
      return;
    }

    if (isSharing) {
      // Stop sharing
      setIsSharing(false);
      stopLocationTracking();
      toast({
        title: "Location Sharing Disabled",
        description: "Your location is no longer being shared",
      });
    } else {
      // Start sharing
      setIsSharing(true);
      startLocationTracking();
      toast({
        title: "Location Sharing Enabled",
        description: "Your location is now being shared with friends",
      });
    }
  };

  const getStatusColor = () => {
    switch (locationStatus) {
      case 'active':
        return 'bg-green-500';
      case 'requesting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    if (!user) return 'Sign in required';
    
    switch (locationStatus) {
      case 'active':
        return isSharing ? 'Sharing location' : 'Location found';
      case 'requesting':
        return 'Finding location...';
      case 'error':
        return 'Location error';
      default:
        return 'Location off';
    }
  };

  return (
    <Card className="fixed bottom-6 right-6 z-50 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <Badge variant={isSharing ? "default" : "secondary"}>
              {getStatusText()}
            </Badge>
          </div>
          
          <Button
            onClick={toggleLocationSharing}
            variant={isSharing ? "destructive" : "default"}
            size="sm"
            className={isSharing ? "" : "gradient-party border-0"}
            disabled={locationStatus === 'requesting' || !user}
          >
            {isSharing ? (
              <>📍 Stop Sharing</>
            ) : (
              <>🗺️ Share Location</>
            )}
          </Button>
        </div>
        
        {location && user && (
          <div className="mt-2 text-xs text-muted-foreground">
            📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </div>
        )}
        
        {!user && (
          <div className="mt-2 text-xs text-muted-foreground">
            Sign in to share your location with friends
          </div>
        )}
      </CardContent>
    </Card>
  );
};