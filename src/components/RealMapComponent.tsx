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
  const zonesRef = useRef<Set<string>>(new Set());

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

  // Add zone visualization layers
  const addZoneLayers = () => {
    if (!map.current) return;

    // Add source for zone circles
    map.current.addSource('zone-circles', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    // Add fill layer with fade effect
    map.current.addLayer({
      id: 'zone-fill',
      type: 'fill',
      source: 'zone-circles',
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'active'], true],
          '#10b981', // Green for active zones
          '#6366f1'  // Purple for other zones
        ],
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 0.1,
          15, 0.3,
          18, 0.1
        ]
      }
    });

    // Add border layer
    map.current.addLayer({
      id: 'zone-border',
      type: 'line',
      source: 'zone-circles',
      paint: {
        'line-color': [
          'case',
          ['==', ['get', 'active'], true],
          '#10b981',
          '#6366f1'
        ],
        'line-width': 2,
        'line-opacity': 0.8
      }
    });
  };

  // Create zone circle geometry
  const createZoneCircle = (center: [number, number], radiusKm = 0.5, zoneKey: string, isActive = false) => {
    const points = 64;
    const km = radiusKm;
    const ret = [];
    const distanceX = km / (111.32 * Math.cos(center[1] * Math.PI / 180));
    const distanceY = km / 110.54;

    let theta, x, y;
    for (let i = 0; i < points; i++) {
      theta = (i / points) * (2 * Math.PI);
      x = distanceX * Math.cos(theta);
      y = distanceY * Math.sin(theta);
      ret.push([center[0] + x, center[1] + y]);
    }
    ret.push(ret[0]);

    return {
      type: 'Feature' as const,
      properties: {
        zoneKey,
        active: isActive
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [ret]
      }
    };
  };

  // Update zone visualization
  const updateZoneVisualization = (userProfiles: {[key: string]: any}, currentUserZone?: string) => {
    if (!map.current) return;

    const source = map.current.getSource('zone-circles') as mapboxgl.GeoJSONSource;
    if (!source) return;

    // Get unique zones from user profiles
    const zones = new Set<string>();
    const zoneData: {[key: string]: {center: [number, number], active: boolean}} = {};

    Object.values(userProfiles).forEach((profile: any) => {
      if (profile.zone_key && profile.location_blurred_lng && profile.location_blurred_lat) {
        zones.add(profile.zone_key);
        if (!zoneData[profile.zone_key]) {
          zoneData[profile.zone_key] = {
            center: [parseFloat(profile.location_blurred_lng), parseFloat(profile.location_blurred_lat)],
            active: profile.zone_key === currentUserZone
          };
        }
      }
    });

    // Add current user zone if not already present
    if (currentUserZone && userLocation) {
      zones.add(currentUserZone);
      if (!zoneData[currentUserZone]) {
        zoneData[currentUserZone] = {
          center: [userLocation.lng, userLocation.lat],
          active: true
        };
      }
    }

    // Create zone circle features
    const features = Array.from(zones).map(zoneKey => {
      const zone = zoneData[zoneKey];
      return createZoneCircle(zone.center, 0.5, zoneKey, zone.active);
    });

    source.setData({
      type: 'FeatureCollection',
      features
    });

    zonesRef.current = zones;
  };

  // Add test users for demonstration
  const addTestUsers = async () => {
    if (!user || !userLocation) return;

    const testUsers = [
      {
        user_id: 'test-user-1',
        display_name: 'Alex Park',
        avatar_url: 'https://models.readyplayer.me/66f77e043f2b57e8f9f5dccd.png',
        location_blurred_lat: userLocation.lat + 0.002,
        location_blurred_lng: userLocation.lng + 0.002,
        zone_key: 'zone_40.716_-74.004',
        inSameZone: true
      },
      {
        user_id: 'test-user-2', 
        display_name: 'Sam Chen',
        avatar_url: 'https://models.readyplayer.me/66f77e1c3f2b57e8f9f5dce5.png',
        location_blurred_lat: userLocation.lat - 0.001,
        location_blurred_lng: userLocation.lng + 0.001,
        zone_key: 'zone_40.712_-74.006',
        inSameZone: false
      }
    ];

    // Add test users to profiles map
    const updatedProfiles = { ...userProfiles };
    testUsers.forEach(testUser => {
      updatedProfiles[testUser.user_id] = testUser;
      
      addUserMarker(
        testUser.location_blurred_lng,
        testUser.location_blurred_lat,
        testUser.user_id,
        testUser.display_name,
        false,
        testUser.avatar_url,
        false,
        testUser.zone_key,
        testUser.inSameZone,
        testUser.inSameZone ? '#10b981' : '#6b7280'
      );
    });

    setUserProfiles(updatedProfiles);
    
    // Update zone visualization with test users
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('zone_key')
      .eq('user_id', user.id)
      .maybeSingle();
    
    updateZoneVisualization(updatedProfiles, currentUserProfile?.zone_key);
  };

  // Load real users with zone-based system for friend requests
  const loadRealUsers = async () => {
    try {
      console.log('Loading users with zone-based friend system...');
      
      // Get current user's zone first
      let currentUserZone = null;
      if (user) {
        const { data: currentUserProfile } = await supabase
          .from('profiles')
          .select('zone_key')
          .eq('user_id', user.id)
          .eq('location_sharing_enabled', true)
          .maybeSingle();
        
        currentUserZone = currentUserProfile?.zone_key;
        console.log('Current user zone:', currentUserZone);
      }
      
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
        // Check friendships and zone compatibility
        const friendshipPromises = profiles.map(async (profile) => {
          if (!user) return { ...profile, isFriend: false, inSameZone: false };

          // Check if users are friends
          const { data: friendData } = await supabase.rpc('are_users_friends', {
            user1_id: user.id,
            user2_id: profile.user_id
          });

          // Check if in same zone for friend requests
          const inSameZone = currentUserZone && profile.zone_key === currentUserZone;

          return {
            ...profile,
            isFriend: friendData || false,
            inSameZone: inSameZone || false,
            location: {
              lat: parseFloat(profile.location_blurred_lat.toString()),
              lng: parseFloat(profile.location_blurred_lng.toString())
            }
          };
        });

        const profilesWithFriendship = await Promise.all(friendshipPromises);
        
        // Filter and prioritize users in same zone
        const sameZoneUsers = profilesWithFriendship.filter(p => p.inSameZone);
        const otherUsers = profilesWithFriendship.filter(p => !p.inSameZone);
        
        console.log(`Found ${sameZoneUsers.length} users in same zone, ${otherUsers.length} in other zones`);
        
        // Create profiles map for UI (prioritize same zone users)
        const profilesMap: {[key: string]: any} = {};
        [...sameZoneUsers, ...otherUsers].forEach(profile => {
          profilesMap[profile.user_id] = profile;
        });
        setUserProfiles(profilesMap);

        // Update zone visualization
        updateZoneVisualization(profilesMap, currentUserZone);

        // Add markers for each user with zone indicators
        [...sameZoneUsers, ...otherUsers].forEach(profile => {
          const displayName = profile?.display_name || 'Unknown User';
          const markerColor = profile.inSameZone ? '#10b981' : '#6b7280'; // Green for same zone, gray for others

          addUserMarker(
            parseFloat(profile.location_blurred_lng.toString()),
            parseFloat(profile.location_blurred_lat.toString()),
            profile.user_id,
            displayName,
            false,
            profile?.avatar_url,
            profile.isFriend,
            profile.zone_key,
            profile.inSameZone,
            markerColor
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
      addZoneLayers();
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
            blurred?.zone_key,
            false, // Current user is not in same zone as themselves
            '#3b82f6'
          );

          // Load other users and add test users for demo
          loadRealUsers();
          setTimeout(() => addTestUsers(), 1000); // Add test users after real users load
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

  // Add zone-based avatar marker with enhanced visual indicators
  const addUserMarker = (
    lng: number, 
    lat: number, 
    userId: string, 
    name: string, 
    isCurrentUser = false, 
    avatarUrl?: string, 
    isFriend = false, 
    zoneKey?: string,
    inSameZone = false,
    markerColor = '#10b981'
  ) => {
    if (!map.current) return;

    // Remove existing marker for this user
    const markerId = isCurrentUser ? 'current-user' : userId;
    if (markersRef.current[markerId]) {
      markersRef.current[markerId].remove();
    }

    // Create zone-aware avatar marker element
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
      // Snapchat-style full-body avatar PNG with zone-based border
      const avatarImg = document.createElement('img');
      avatarImg.src = avatarUrl;
      avatarImg.style.cssText = `
        width: 48px;
        height: 96px;
        object-fit: contain;
        object-position: center bottom;
        filter: drop-shadow(0 1px 3px rgba(0,0,0,0.2));
        border-radius: 8px;
        ${isCurrentUser ? 'border: 3px solid #3b82f6;' : ''}
        ${inSameZone && !isCurrentUser ? `border: 2px solid ${markerColor};` : ''}
        ${isFriend ? 'border: 2px solid #10b981;' : ''}
        transition: transform 0.2s ease;
      `;
      
      // Add zone indicator dot
      if (!isCurrentUser) {
        const zoneIndicator = document.createElement('div');
        zoneIndicator.style.cssText = `
          position: absolute;
          top: -2px;
          right: -2px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${inSameZone ? '#10b981' : '#6b7280'};
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
        `;
        zoneIndicator.textContent = inSameZone ? '🤝' : '📍';
        el.appendChild(zoneIndicator);
      }
      
      // Add hover animation
      avatarImg.addEventListener('mouseenter', () => {
        avatarImg.style.transform = 'scale(1.05)';
      });
      avatarImg.addEventListener('mouseleave', () => {
        avatarImg.style.transform = 'scale(1)';
      });
      
      el.appendChild(avatarImg);
    } else {
      // Fallback with zone-based styling
      const fallback = document.createElement('div');
      fallback.style.cssText = `
        width: 40px;
        height: 40px;
        background: ${isCurrentUser ? '#3b82f6' : (inSameZone ? markerColor : '#6b7280')};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        margin-bottom: 8px;
      `;
      fallback.textContent = isCurrentUser ? '📍' : (inSameZone ? '🤝' : name.charAt(0).toUpperCase());
      el.appendChild(fallback);
    }

    console.log('Adding zone-based avatar marker for:', name, 'Zone:', zoneKey, 'Same zone:', inSameZone);

    // Create enhanced popup with zone-based friend request functionality
    let popupContent = `
      <div class="p-3 bg-white rounded-lg shadow-lg min-w-[200px]">
        <h3 class="font-semibold text-gray-900 mb-1">${name}</h3>
        <p class="text-sm text-gray-600 mb-2">${isCurrentUser ? 'Your location' : (isFriend ? 'Friend nearby' : 'Person nearby')}</p>
        <p class="text-xs text-gray-500">${avatarUrl ? '✨ Full Body Avatar' : '🎭 Default Avatar'}</p>
        <p class="text-xs text-blue-600 mt-1">📍 Zone: ${zoneKey || 'Unknown'}</p>`;

    // Add friend request button only for non-friends in the SAME zone
    if (!isCurrentUser && !isFriend && user && inSameZone) {
      popupContent += `
        <button 
          onclick="window.sendFriendRequest('${userId}')" 
          class="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded transition-colors"
        >
          🤝 Add Friend (Same Zone)
        </button>`;
    } else if (!isCurrentUser && !isFriend && user && zoneKey && !inSameZone) {
      popupContent += `
        <div class="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
          📍 Move to zone ${zoneKey} to send friend request
        </div>`;
    }

    if (isFriend) {
      popupContent += `
        <div class="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
          <span>✓</span> Friend - Precise location
        </div>`;
    } else if (!isCurrentUser) {
      popupContent += `
        <div class="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <span>📍</span> Zone-based location (~100m)
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
                    {userProfile.inSameZone && (
                      <p className="text-xs text-green-600">Same zone</p>
                    )}
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