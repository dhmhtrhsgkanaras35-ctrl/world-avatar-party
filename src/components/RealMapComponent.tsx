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

  // Load real users with open location sharing (less privacy-focused)
  const loadRealUsers = async () => {
    try {
      console.log('Loading users with open location sharing...');
      
      // Get all users sharing location publicly
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, location_blurred_lat, location_blurred_lng, zone_key')
        .eq('location_sharing_enabled', true)
        .not('location_blurred_lat', 'is', null)
        .not('location_blurred_lng', 'is', null)
        .neq('user_id', user?.id || ''); // Exclude current user

      if (profileError) {
        console.error('Error loading profiles:', profileError);
        return;
      }

      console.log('Loaded profiles with location:', profiles);

      if (profiles && profiles.length > 0) {
        // For mobile-friendly open sharing, check friendships but show everyone
        const friendshipPromises = profiles.map(async (profile) => {
          if (!user) return { ...profile, isFriend: false, preciseLocation: null };

          // Check if users are friends for enhanced features
          const { data: friendData } = await supabase.rpc('are_users_friends', {
            user1_id: user.id,
            user2_id: profile.user_id
          });

          return {
            ...profile,
            isFriend: friendData || false,
            // Use slightly blurred location for everyone (mobile-friendly)
            location: {
              lat: parseFloat(profile.location_blurred_lat.toString()),
              lng: parseFloat(profile.location_blurred_lng.toString())
            }
          };
        });

        const profilesWithFriendship = await Promise.all(friendshipPromises);
        
        // Create profiles map for UI
        const profilesMap: {[key: string]: any} = {};
        profilesWithFriendship.forEach(profile => {
          profilesMap[profile.user_id] = profile;
        });
        setUserProfiles(profilesMap);

        // Add markers for each user
        profilesWithFriendship.forEach(profile => {
          const displayName = profile?.display_name || 'Unknown User';

          // Use the location coordinates from the profile
          const location = {
            lat: parseFloat(profile.location_blurred_lat.toString()),
            lng: parseFloat(profile.location_blurred_lng.toString())
          };

          addUserMarker(
            location.lng,
            location.lat,
            profile.user_id,
            displayName,
            false,
            profile?.avatar_url,
            profile.isFriend,
            profile.zone_key
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
      async (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lng: longitude };
        setUserLocation(location);

        if (map.current && user) {
          // Update both user_locations (precise) and profiles (public) with location
          const { data: blurredData } = await supabase.rpc('blur_coordinates', {
            lat: latitude,
            lng: longitude,
            blur_meters: 100 // Less blur for open sharing
          });

          const blurred = blurredData?.[0];

          const [locationResult, profileResult] = await Promise.all([
            // Update precise location in user_locations
            supabase
              .from('user_locations')
              .upsert({
                user_id: user.id,
                latitude: latitude,
                longitude: longitude,
                is_sharing: true,
                last_updated: new Date().toISOString()
              }, { onConflict: 'user_id' }),
            
            // Update public location in profiles
            supabase
              .from('profiles')
              .upsert({
                user_id: user.id,
                location_blurred_lat: blurred?.blurred_lat,
                location_blurred_lng: blurred?.blurred_lng,
                zone_key: blurred?.zone_key,
                location_sharing_enabled: true,
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' })
          ]);

          if (locationResult.error) {
            console.error('Error updating user location:', locationResult.error);
          }

          if (profileResult.error) {
            console.error('Error updating profile location:', profileResult.error);
          }

          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            duration: 2000
          });

          // Get user's avatar from profile and add marker
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('avatar_url, display_name')
            .eq('user_id', user.id)
            .maybeSingle();

          addUserMarker(
            longitude, 
            latitude, 
            user.id, 
            userProfile?.display_name || 'You', 
            true, 
            userProfile?.avatar_url,
            false, // Current user is not a "friend" to themselves
            blurred?.zone_key
          );

          // Load other users after adding current user
          loadRealUsers();
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

  // Add Snapchat-style full-body avatar marker with friend request functionality
  const addUserMarker = (
    lng: number, 
    lat: number, 
    userId: string, 
    name: string, 
    isCurrentUser = false, 
    avatarUrl?: string, 
    isFriend = false, 
    zoneKey?: string
  ) => {
    if (!map.current) return;

    // Remove existing marker for this user
    const markerId = isCurrentUser ? 'current-user' : userId;
    if (markersRef.current[markerId]) {
      markersRef.current[markerId].remove();
    }

    // Create Snapchat-style avatar marker element
    const el = document.createElement('div');
    el.style.cssText = `
      width: 50px;
      height: 100px;
      cursor: pointer;
      position: relative;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      transform-origin: center bottom;
    `;

    if (avatarUrl) {
      // Snapchat-style full-body avatar PNG with transparent background
      const avatarImg = document.createElement('img');
      avatarImg.src = avatarUrl;
      avatarImg.style.cssText = `
        width: 48px;
        height: 96px;
        object-fit: contain;
        object-position: center bottom;
        filter: drop-shadow(0 1px 3px rgba(0,0,0,0.2));
        ${isCurrentUser ? 'filter: drop-shadow(0 0 8px #3b82f6) drop-shadow(0 1px 3px rgba(0,0,0,0.2));' : ''}
        transition: transform 0.2s ease;
      `;
      
      // Add subtle hover animation
      avatarImg.addEventListener('mouseenter', () => {
        avatarImg.style.transform = 'scale(1.05)';
      });
      avatarImg.addEventListener('mouseleave', () => {
        avatarImg.style.transform = 'scale(1)';
      });
      
      el.appendChild(avatarImg);
    } else {
      // Fallback Bitmoji-style bubble avatar
      const fallback = document.createElement('div');
      fallback.style.cssText = `
        width: 40px;
        height: 40px;
        background: ${isCurrentUser ? '#3b82f6' : '#10b981'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        margin-bottom: 8px;
      `;
      fallback.textContent = isCurrentUser ? '📍' : name.charAt(0).toUpperCase();
      el.appendChild(fallback);
    }

    console.log('Adding Snapchat-style avatar marker for:', name, 'with avatar:', avatarUrl);

    // Create enhanced popup with friend request functionality
    let popupContent = `
      <div class="p-3 bg-white rounded-lg shadow-lg min-w-[200px]">
        <h3 class="font-semibold text-gray-900 mb-1">${name}</h3>
        <p class="text-sm text-gray-600 mb-2">${isCurrentUser ? 'Your location' : (isFriend ? 'Friend nearby' : 'Person nearby')}</p>
        <p class="text-xs text-gray-500">${avatarUrl ? '✨ Full Body Avatar' : '🎭 Default Avatar'}</p>`;

    // Add friend request button for non-friends in same zone
    if (!isCurrentUser && !isFriend && user && zoneKey) {
      popupContent += `
        <button 
          onclick="window.sendFriendRequest('${userId}')" 
          class="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded"
        >
          Add Friend
        </button>`;
    }

    if (isFriend) {
      popupContent += `
        <div class="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
          <span>✓</span> Friend - Precise location
        </div>`;
    } else if (!isCurrentUser) {
      popupContent += `
        <div class="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <span>📍</span> Approximate location
        </div>`;
    }

    popupContent += `</div>`;

    const popup = new mapboxgl.Popup({ 
      offset: [0, -10],
      className: 'avatar-popup'
    }).setHTML(popupContent);

    // Create marker with custom anchor point (bottom center for feet alignment)
    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
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