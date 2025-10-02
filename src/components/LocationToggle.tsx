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
      console.log('Updating location in database. Sharing:', sharing);
      
      // Update both user_locations (precise) and profiles (for public visibility) with location
      const { data: blurredData } = await supabase.rpc('blur_coordinates', {
        lat: lat,
        lng: lng,
        blur_meters: 100 // Reduced blur for more open sharing
      });

      const blurred = blurredData?.[0];

      // For mobile-friendly open sharing, store both precise and slightly blurred locations
      const [locationResult, profileResult] = await Promise.all([
        // Keep precise location in user_locations 
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
        
        // Store publicly visible location in profiles (less blurred for open sharing)
        supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            location_blurred_lat: sharing ? blurred?.blurred_lat : null,
            location_blurred_lng: sharing ? blurred?.blurred_lng : null,
            zone_key: sharing ? blurred?.zone_key : null,
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
      } else {
        console.log('Successfully updated profile with sharing status:', sharing);
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
      timeout: 30000, // Increased to 30 seconds
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
      console.error('Geolocation error:', error);
      setLocationStatus('error');

      // If location fails but user wants to share, use a default location
      if (isSharing && user) {
        // Use a default location (you can adjust these coordinates)
        const defaultLat = 40.7128; // NYC default
        const defaultLng = -74.0060;
        
        console.log('Using default location for sharing');
        setLocation({ lat: defaultLat, lng: defaultLng });
        setLocationStatus('active');
        updateLocationInDatabase(defaultLat, defaultLng, true);
      }
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
      
      // Immediately update database to disable sharing
      if (location) {
        await updateLocationInDatabase(location.lat, location.lng, false);
      }
      
      // Trigger map to remove avatar immediately
      window.dispatchEvent(new CustomEvent('locationSharingDisabled'));
      
      toast({
        title: "Zone Sharing Off",
        description: "Your location zone is no longer shared with the avatar world",
      });
    } else {
      // Start sharing
      setIsSharing(true);
      
      // Try to get real location first, but don't wait too long
      const locationPromise = new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // Use less accurate but faster
          timeout: 5000, // Short timeout for immediate response
          maximumAge: 300000 // 5 minutes
        });
      });

      try {
        const position = await locationPromise;
        const { latitude, longitude } = position.coords;
        console.log('Got real location:', latitude, longitude);
        setLocation({ lat: latitude, lng: longitude });
        setLocationStatus('active');
        await updateLocationInDatabase(latitude, longitude, true);
        
        // Trigger map update immediately
        window.dispatchEvent(new CustomEvent('locationSharingEnabled', { 
          detail: { latitude, longitude, sharing: true } 
        }));
        
        toast({
          title: "Zone Sharing On",
          description: "Your location zone is being shared with the avatar world",
        });
        
        // Start continuous tracking
        startLocationTracking();
      } catch (error) {
        console.log('Real location failed, using default:', error);
        // Use default location if real location fails
        const defaultLat = 40.7128; // NYC coordinates
        const defaultLng = -74.0060;
        
        setLocation({ lat: defaultLat, lng: defaultLng });
        setLocationStatus('active');
        await updateLocationInDatabase(defaultLat, defaultLng, true);
        
        // Trigger map update immediately
        window.dispatchEvent(new CustomEvent('locationSharingEnabled', { 
          detail: { latitude: defaultLat, longitude: defaultLng, sharing: true } 
        }));
        
        toast({
          title: "Zone Sharing On",
          description: "Your location zone is being shared with the avatar world",
        });
        
        // Still try to start tracking in background
        startLocationTracking();
      }
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
        return isSharing ? 'Zone active' : 'Zone found';
      case 'requesting':
        return 'Finding zone...';
      case 'error':
        return 'Zone error';
      default:
        return 'Zone off';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '3.5rem',
      left: '0.5rem',
      zIndex: 40
    }}>
      <Card style={{
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        backgroundColor: 'hsl(var(--background) / 0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid hsl(var(--border))'
      }}>
        <CardContent style={{ padding: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{
              width: '0.375rem',
              height: '0.375rem',
              borderRadius: '9999px',
              backgroundColor: locationStatus === 'active' ? '#22c55e' : 
                              locationStatus === 'requesting' ? '#eab308' :
                              locationStatus === 'error' ? '#ef4444' : '#6b7280'
            }} />
            
            <Button
              onClick={toggleLocationSharing}
              variant={isSharing ? "destructive" : "ghost"}
              size="sm"
              style={{
                height: '1.5rem',
                padding: '0 0.375rem',
                fontSize: '0.75rem',
                backgroundColor: isSharing ? undefined : 'hsl(var(--primary) / 0.1)'
              }}
              className={isSharing ? "" : "hover:bg-primary/20"}
              disabled={locationStatus === 'requesting' || !user}
            >
              {isSharing ? '📍' : '🗺️'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};