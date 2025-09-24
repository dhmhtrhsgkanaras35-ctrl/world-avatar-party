import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthProvider";
import { AvatarDisplay } from "./AvatarDisplay";
import { useToast } from "@/hooks/use-toast";

interface UserLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  is_sharing: boolean;
  profile?: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

export const RealMapComponent = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: any}>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  // Get Mapbox token from Supabase Edge Function
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          console.error('Error fetching Mapbox token:', error);
          toast({
            title: "Map Error",
            description: "Failed to load map configuration",
            variant: "destructive"
          });
          return;
        }
        
        if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.error('Error calling get-mapbox-token function:', error);
      }
    };

    fetchMapboxToken();
  }, [toast]);

  // Load real users from Supabase with avatars
  const loadRealUsers = async () => {
    try {
      console.log('Loading real users from Supabase...');
      
      const { data: locations, error: locationError } = await supabase
        .from('user_locations')
        .select('*')
        .eq('is_sharing', true);

      if (locationError) {
        console.error('Error loading locations:', locationError);
        return;
      }

      console.log('Loaded locations:', locations);

      if (locations && locations.length > 0) {
        const userIds = locations.map(loc => loc.user_id);
        
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', userIds);

        if (profileError) {
          console.error('Error loading profiles:', profileError);
          return;
        }

        console.log('Loaded profiles:', profiles);

        const profilesMap: {[key: string]: any} = {};
        profiles?.forEach(profile => {
          profilesMap[profile.user_id] = profile;
        });
        setUserProfiles(profilesMap);

        // Add markers for each user with avatar
        locations.forEach(location => {
          const profile = profilesMap[location.user_id];
          const displayName = profile?.display_name || 'Unknown User';
          addUserMarker(
            parseFloat(location.longitude.toString()),
            parseFloat(location.latitude.toString()),
            location.user_id,
            displayName,
            false,
            profile?.avatar_url
          );
        });
      }
    } catch (error) {
      console.error('Error loading real users:', error);
    }
  };

  // Initialize map when token is available
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.0066, 40.7135], // Default to NYC
      zoom: 13,
      attributionControl: false
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
      getUserLocation();
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [mapboxToken]);

  // Get user's current location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Error",
        description: "Geolocation is not supported by this browser",
        variant: "destructive"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lng: longitude };
        setUserLocation(location);

        if (map.current) {
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            duration: 2000
          });

          // Add user marker
          if (user) {
            addUserMarker(longitude, latitude, user.id, 'You', true);
          }
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        toast({
          title: "Location Error", 
          description: "Could not get your current location",
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Add user marker with Ready Player Me avatar
  const addUserMarker = (lng: number, lat: number, userId: string, name: string, isCurrentUser = false, avatarUrl?: string) => {
    if (!map.current) return;

    // Remove existing marker for this user
    const markerId = isCurrentUser ? 'current-user' : userId;
    if (markersRef.current[markerId]) {
      markersRef.current[markerId].remove();
    }

    // Create marker element
    const el = document.createElement('div');
    el.style.cssText = `
      width: 50px;
      height: 50px;
      cursor: pointer;
      position: relative;
    `;

    // Check if avatar URL is a Ready Player Me URL or any valid URL
    const hasValidAvatar = avatarUrl && 
      (avatarUrl.includes('readyplayer.me') || avatarUrl.startsWith('http'));
    
    console.log('Adding marker for:', name, 'with avatar:', avatarUrl, 'valid:', hasValidAvatar);
    
    if (hasValidAvatar) {
      // Use Ready Player Me avatar or other valid image
      const avatarImg = document.createElement('img');
      avatarImg.src = avatarUrl;
      avatarImg.style.cssText = `
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: 3px solid ${isCurrentUser ? '#3b82f6' : '#10b981'};
        object-fit: cover;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      
      avatarImg.onload = () => {
        console.log('Avatar loaded successfully for:', name);
      };
      
      avatarImg.onerror = () => {
        console.error('Failed to load avatar for:', name);
        // Fallback to simple avatar
        el.innerHTML = '';
        el.style.cssText += `
          background: ${isCurrentUser ? '#3b82f6' : '#10b981'};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: white;
          font-weight: bold;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        el.textContent = isCurrentUser ? '📍' : name.charAt(0);
      };
      
      el.appendChild(avatarImg);
    } else {
      // Fallback to simple avatar
      el.style.cssText += `
        background: ${isCurrentUser ? '#3b82f6' : '#10b981'};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        color: white;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      el.textContent = isCurrentUser ? '📍' : name.charAt(0);
    }

    // Add status indicator for other users
    if (!isCurrentUser) {
      const statusDot = document.createElement('div');
      statusDot.style.cssText = `
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        background: #10b981;
        border: 2px solid white;
        border-radius: 50%;
      `;
      el.appendChild(statusDot);
    }

    // Create popup
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
      `<div class="p-2">
        <h3 class="font-semibold">${name}</h3>
        <p class="text-sm text-gray-600">${isCurrentUser ? 'Your location' : 'Friend nearby'}</p>
        <p class="text-xs text-gray-500">Avatar: ${hasValidAvatar ? 'Custom' : 'Default'}</p>
      </div>`
    );

    // Create and add marker
    const marker = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map.current);

    markersRef.current[markerId] = marker;
  };

  // Load nearby users when map is ready
  useEffect(() => {
    if (mapLoaded && userLocation) {
      console.log('Map loaded, loading real users from Supabase...');
      loadRealUsers();
    }
  }, [mapLoaded, userLocation]);

  if (!mapboxToken) {
    return (
      <Card className="w-full h-96 flex items-center justify-center">
        <CardContent>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full h-full">
      {/* Map Container - Full screen */}
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map Controls */}
      <div className="absolute top-20 left-4 space-y-2 z-20">
        <Button
          size="sm"
          onClick={getUserLocation}
          className="bg-white text-black hover:bg-gray-100 shadow-lg"
        >
          📍 My Location
        </Button>
      </div>

      {/* Nearby Users Info - Floating */}
      {Object.keys(userProfiles).length > 0 && (
        <Card className="absolute bottom-20 right-4 max-w-xs shadow-lg z-20">
          <CardContent className="p-3">
            <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
              👥 People Nearby
              <Badge variant="secondary">{Object.keys(userProfiles).length}</Badge>
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {Object.values(userProfiles).slice(0, 3).map((userProfile: any) => (
                <div key={userProfile.user_id} className="flex items-center gap-2">
                  <div className="w-6 h-6">
                    <AvatarDisplay 
                      avatarUrl={userProfile?.avatar_url}
                      size="small"
                      showStatus={true}
                      status="online"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">
                      {userProfile?.display_name || 'Unknown'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Info */}
      {userLocation && (
        <Card className="absolute bottom-4 left-4 shadow-lg z-20">
          <CardContent className="p-2">
            <p className="text-xs text-muted-foreground">
              {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};