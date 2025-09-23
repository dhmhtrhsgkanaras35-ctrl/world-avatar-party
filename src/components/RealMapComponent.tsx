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
  const [nearbyUsers, setNearbyUsers] = useState<UserLocation[]>([]);
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

  // Load user profiles with Ready Player Me avatars
  const loadUserProfiles = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url');

      if (error) throw error;

      const profileMap: {[key: string]: any} = {};
      profiles?.forEach(profile => {
        profileMap[profile.user_id] = profile;
      });
      setUserProfiles(profileMap);
      console.log('Loaded user profiles:', profileMap);
    } catch (error) {
      console.error('Error loading user profiles:', error);
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
      loadUserProfiles();
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
  const addUserMarker = (lng: number, lat: number, userId: string, name: string, isCurrentUser = false) => {
    if (!map.current) return;

    // Remove existing marker for this user
    const markerId = isCurrentUser ? 'current-user' : userId;
    if (markersRef.current[markerId]) {
      markersRef.current[markerId].remove();
    }

    const userProfile = userProfiles[userId];
    const avatarUrl = userProfile?.avatar_url;

    // Create marker element
    const el = document.createElement('div');
    el.style.cssText = `
      width: 50px;
      height: 50px;
      cursor: pointer;
      position: relative;
    `;

    // Check if avatar URL is Ready Player Me format
    const isReadyPlayerMe = avatarUrl && avatarUrl.startsWith('https://models.readyplayer.me/');
    
    if (isReadyPlayerMe) {
      // Use Ready Player Me avatar
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

    // Add status indicator
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
      </div>`
    );

    // Create and add marker
    const marker = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map.current);

    markersRef.current[markerId] = marker;
  };

  // Load nearby users (mock data for now)
  useEffect(() => {
    if (!mapLoaded || !userLocation) return;

    // Mock nearby users for demonstration
    const mockUsers: UserLocation[] = [
      {
        user_id: 'user-1',
        latitude: userLocation.lat + 0.001,
        longitude: userLocation.lng + 0.001,
        is_sharing: true,
        profile: {
          username: 'alex_party',
          display_name: 'Alex',
          avatar_url: 'https://models.readyplayer.me/67054f9cfd50cc4cc0e4de18.glb'
        }
      },
      {
        user_id: 'user-2', 
        latitude: userLocation.lat - 0.0015,
        longitude: userLocation.lng + 0.0008,
        is_sharing: true,
        profile: {
          username: 'sam_explorer',
          display_name: 'Sam',
          avatar_url: 'https://models.readyplayer.me/67054f9cfd50cc4cc0e4de19.glb'
        }
      }
    ];

    setNearbyUsers(mockUsers);

    // Add markers for nearby users
    mockUsers.forEach((userLoc) => {
      addUserMarker(
        userLoc.longitude,
        userLoc.latitude,
        userLoc.user_id,
        userLoc.profile?.display_name || 'Unknown',
        false
      );
    });
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
    <div className="space-y-6">
      {/* Map Container */}
      <div className="relative">
        <div ref={mapContainer} className="w-full h-full rounded-lg shadow-lg" />
        
        {/* Map Controls */}
        <div className="absolute top-4 left-4 space-y-2">
          <Button
            size="sm"
            onClick={getUserLocation}
            className="bg-white text-black hover:bg-gray-100 shadow-lg"
          >
            📍 My Location
          </Button>
        </div>

        {/* Legend */}
        <Card className="absolute bottom-4 left-4 shadow-lg">
          <CardContent className="p-3">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>You</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Friends</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nearby Users */}
      {nearbyUsers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              👥 People Nearby
              <Badge variant="secondary">{nearbyUsers.length}</Badge>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {nearbyUsers.map((userLoc) => {
                const userProfile = userProfiles[userLoc.user_id];
                const isReadyPlayerMe = userProfile?.avatar_url && userProfile.avatar_url.startsWith('https://models.readyplayer.me/');

                return (
                  <div key={userLoc.user_id} className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="w-12 h-12 mx-auto mb-2">
                      <AvatarDisplay 
                        avatarUrl={isReadyPlayerMe ? userProfile.avatar_url : null}
                        size="medium"
                        showStatus={true}
                        status="online"
                      />
                    </div>
                    <p className="text-sm font-medium">{userLoc.profile?.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      @{userLoc.profile?.username}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {userLocation && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">📍 Your Location</h3>
            <p className="text-sm text-muted-foreground">
              Lat: {userLocation.lat.toFixed(6)}, Lng: {userLocation.lng.toFixed(6)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};