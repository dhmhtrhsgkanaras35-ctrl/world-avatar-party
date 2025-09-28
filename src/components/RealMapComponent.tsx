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
import { getZoneName } from "@/utils/zoneNames";
import { createEventMarker3D } from "./EventMarker3D";

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

interface Event {
  id: string;
  title: string;
  event_type: string;
  latitude: number;
  longitude: number;
  start_time?: string;
  end_time?: string;
  max_attendees?: number;
  created_by: string;
  is_public: boolean;
}

export const RealMapComponent = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: any}>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [showZoneNote, setShowZoneNote] = useState(true);
  const [tempEvents, setTempEvents] = useState<any[]>([]);
  const [editModeEvents, setEditModeEvents] = useState<Set<string>>(new Set());
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const eventMarkersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const zonesRef = useRef<Set<string>>(new Set());

  // Listen for temporary event creation from dialog
  useEffect(() => {
    console.log('Setting up tempEventCreated listener');
    const handleTempEventCreated = (event: any) => {
      console.log('Received tempEventCreated event:', event.detail);
      const tempEventData = event.detail;
      setTempEvents(prev => {
        console.log('Adding temp event to state:', tempEventData);
        console.log('Previous temp events:', prev);
        return [...prev, tempEventData];
      });
      
      // Fly to the event location for better UX
      if (map.current) {
        console.log('Flying to event location:', tempEventData.longitude, tempEventData.latitude);
        map.current.flyTo({
          center: [tempEventData.longitude, tempEventData.latitude],
          zoom: 16,
          duration: 1000
        });
      }
    };

    window.addEventListener('tempEventCreated', handleTempEventCreated);
    return () => {
      window.removeEventListener('tempEventCreated', handleTempEventCreated);
    };
  }, []);

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

  // Show demo zone info when no real users are found
  const showDemoInfo = () => {
    if (!user || !userLocation) return;

    console.log('No other real users found - showing zone info for demo');
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
      // Clear debounce timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      // Cleanup user markers
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};
      
      // Cleanup ALL event markers (both permanent and temporary)
      Object.values(eventMarkersRef.current).forEach(marker => marker.remove());
      eventMarkersRef.current = {};
      
      // Clear temporary events
      setTempEvents([]);
      
      if (map.current) {
        map.current.remove();
      }
    };
  }, [mapboxToken]);

  // Listen for profile updates (location sharing changes)
  useEffect(() => {
    if (!user) return;

    // Listen for custom events from LocationToggle
    const handleLocationSharingEnabled = (event: CustomEvent) => {
      console.log('Location sharing enabled event:', event.detail);
      const { latitude, longitude } = event.detail;
      
      // Re-fetch user's avatar from Supabase and add marker
      if (map.current && user) {
        console.log('Re-fetching user avatar for location sharing');
        // Get user's avatar from profile and add marker with cache-busting
        supabase
          .from('profiles')
          .select('avatar_url, display_name')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data: userProfile }) => {
            console.log('User profile for marker:', userProfile);
            let avatarUrl = userProfile?.avatar_url;
            
            // Add cache-busting to avatar URL
            if (avatarUrl) {
              const separator = avatarUrl.includes('?') ? '&' : '?';
              avatarUrl = `${avatarUrl}${separator}t=${Date.now()}`;
            }
            
            addUserMarker(
              longitude,
              latitude,
              user.id,
              userProfile?.display_name || user.user_metadata?.display_name || 'You',
              true,
              avatarUrl,
              false,
              null, // Will be set after blur calculation
              false,
              '#3b82f6'
            );
          });
      }
    };

    const handleLocationSharingDisabled = () => {
      console.log('Location sharing disabled event - removing user avatar');
      if (map.current) {
        // Remove the current user's avatar marker
        const markerId = 'current-user';
        if (markersRef.current[markerId]) {
          console.log('Removing current user marker from map');
          markersRef.current[markerId].remove();
          delete markersRef.current[markerId];
        }
      }
    };

    window.addEventListener('locationSharingEnabled', handleLocationSharingEnabled as EventListener);
    window.addEventListener('locationSharingDisabled', handleLocationSharingDisabled as EventListener);

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Profile updated, payload:', payload);
          // When user's profile is updated (location sharing toggled), refresh their location
          setTimeout(() => {
            console.log('Refreshing location after profile update');
            getUserLocation();
          }, 500); // Small delay to ensure database is updated
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('locationSharingEnabled', handleLocationSharingEnabled as EventListener);
      window.removeEventListener('locationSharingDisabled', handleLocationSharingDisabled as EventListener);
      supabase.removeChannel(channel);
    };
  }, [user]);

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
          console.log('Getting location for user:', user.id);
          
          // Check current sharing status from profile
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('location_sharing_enabled')
            .eq('user_id', user.id)
            .maybeSingle();

          const isSharing = currentProfile?.location_sharing_enabled || false;
          console.log('Current sharing status:', isSharing);

          // Update both user_locations (precise) and profiles (public) with location
          const { data: blurredData } = await supabase.rpc('blur_coordinates', {
            lat: latitude,
            lng: longitude,
            blur_meters: 100 // Less blur for open sharing
          });

          const blurred = blurredData?.[0];

          const [locationResult, profileResult] = await Promise.all([
            // Update precise location in user_locations (preserve sharing status)
            supabase
              .from('user_locations')
              .upsert({
                user_id: user.id,
                latitude: latitude,
                longitude: longitude,
                is_sharing: isSharing,
                last_updated: new Date().toISOString()
              }, { onConflict: 'user_id' }),
            
            // Update public location in profiles (preserve sharing status)
            supabase
              .from('profiles')
              .upsert({
                user_id: user.id,
                location_blurred_lat: isSharing ? blurred?.blurred_lat : null,
                location_blurred_lng: isSharing ? blurred?.blurred_lng : null,
                zone_key: isSharing ? blurred?.zone_key : null,
                location_sharing_enabled: isSharing,
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

          // Only add user marker if they are sharing location
          if (isSharing) {
            console.log('Adding user marker because sharing is enabled');
            // Get user's avatar from profile and add marker
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('avatar_url, display_name')
              .eq('user_id', user.id)
              .maybeSingle();

            console.log('User profile for marker:', userProfile);
            console.log('Adding marker at coordinates:', longitude, latitude);

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
          } else {
            console.log('Removing user marker because sharing is disabled');
            // Remove current user marker if they exist and are not sharing
            const markerId = 'current-user';
            if (markersRef.current[markerId]) {
              markersRef.current[markerId].remove();
              delete markersRef.current[markerId];
            }
          }

          // Load other users - real users only
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
        timeout: 30000, // Increased timeout
        maximumAge: 60000
      }
    );
  };

  // Helper function to extract avatar ID from various URL formats
  const extractAvatarIdFromUrl = (url: string): string | null => {
    // Extract avatar ID from URLs like:
    // https://models.readyplayer.me/64bfa597e1b8ff9c4e5b4a7d/avatar.glb
    // https://api.readyplayer.me/v1/avatars/64bfa597e1b8ff9c4e5b4a7d.glb
    // https://d1a370nemizbjq.cloudfront.net/64bfa597e1b8ff9c4e5b4a7d.glb
    const matches = url.match(/([a-f0-9]{24})/);
    return matches ? matches[1] : null;
  };

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
    if (!map.current) {
      console.log('Cannot add marker: map not initialized');
      return;
    }

    console.log('addUserMarker called:', { lng, lat, userId, name, isCurrentUser, avatarUrl });

    // Remove existing marker for this user
    const markerId = isCurrentUser ? 'current-user' : userId;
    if (markersRef.current[markerId]) {
      console.log('Removing existing marker:', markerId);
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

      console.log('🎯 Creating marker element for user:', userId, 'with avatarUrl:', avatarUrl);

      // Use Ready Player Me URL directly with CORS workarounds
      console.log('🔍 Processing Ready Player Me avatar URL:', avatarUrl);
      
      if (avatarUrl) {
        // Extract avatar_id from various URL formats
        const idMatch = avatarUrl.match(/([a-f0-9]{24})/);
        const avatarId = idMatch ? idMatch[1] : null;
        console.log('🔑 Extracted avatar ID:', avatarId);
        
        if (avatarId) {
          // Create Ready Player Me URLs that are more likely to work
          const readyPlayerMeUrls = [
            // Try the exact format that works
            `https://models.readyplayer.me/${avatarId}.png?morphTargets=ARKit,Oculus+Visemes&textureAtlas=none&lod=0`,
            // Alternative formats
            `https://d1a370nemizbjq.cloudfront.net/${avatarId}.png`,
            `https://render.readyplayer.me/${avatarId}.png?scene=fullbody-portrait-v1&armature=ArmatureTargetMale&pose=A`,
            avatarUrl // Original as fallback
          ];
          
          createReadyPlayerMeAvatar(readyPlayerMeUrls, 0);
        } else {
          console.log('🔸 No avatar ID found in URL, using original URL');
          createReadyPlayerMeAvatar([avatarUrl], 0);
        }
      } else {
        console.log('🔸 No avatarUrl available, using enhanced fallback');
        createEnhancedFallback();
      }

      function createReadyPlayerMeAvatar(urls: string[], urlIndex: number) {
        const currentUrl = urls[urlIndex];
        console.log('🎯 Trying Ready Player Me URL:', currentUrl);
        
        // Create a canvas to proxy the image and avoid CORS issues
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 96; // Increased size for better quality
        canvas.width = size;
        canvas.height = size * 2; // 2:1 ratio for full body
        
        // Enable high-quality rendering
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        }
        
        const proxyImg = new Image();
        
        // Try to load with crossOrigin
        proxyImg.crossOrigin = 'anonymous';
        
        proxyImg.onload = () => {
          console.log('✅ Ready Player Me image loaded successfully:', currentUrl);
          
          // Draw the image to canvas to create a data URL
          if (ctx) {
            // Clear canvas with transparent background
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw image with high quality scaling
            ctx.drawImage(proxyImg, 0, 0, canvas.width, canvas.height);
            
            // Create the final image element
            const avatarImg = document.createElement('img');
            avatarImg.src = canvas.toDataURL('image/png', 1.0); // Max quality
            avatarImg.style.cssText = `
              width: 48px;
              height: 96px;
              object-fit: cover;
              object-position: center top;
              filter: drop-shadow(0 3px 8px rgba(0,0,0,0.4)) brightness(1.05) contrast(1.05);
              border-radius: 12px;
              ${isCurrentUser ? 'border: 3px solid #3b82f6;' : ''}
              ${inSameZone && !isCurrentUser ? `border: 2px solid ${markerColor};` : ''}
              ${isFriend ? 'border: 2px solid #10b981;' : ''}
              transition: transform 0.2s ease;
              display: block;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
            `;

            // Add hover animation
            avatarImg.addEventListener('mouseenter', () => {
              avatarImg.style.transform = 'scale(1.05)';
            });
            avatarImg.addEventListener('mouseleave', () => {
              avatarImg.style.transform = 'scale(1)';
            });
            
            el.appendChild(avatarImg);
          }
        };
        
        proxyImg.onerror = () => {
          console.log('❌ Ready Player Me URL failed:', currentUrl);
          
          // Try next URL
          const nextIndex = urlIndex + 1;
          if (nextIndex < urls.length) {
            console.log('🔄 Trying next Ready Player Me URL...');
            createReadyPlayerMeAvatar(urls, nextIndex);
          } else {
            console.log('❌ All Ready Player Me URLs failed, trying direct approach');
            // Try direct image approach as final attempt
            createDirectImageAvatar(avatarUrl);
          }
        };
        
        proxyImg.src = currentUrl;
      }

      function createDirectImageAvatar(url: string) {
        console.log('🎯 Trying direct image approach:', url);
        
        const avatarImg = document.createElement('img');
        avatarImg.src = url;
        avatarImg.style.cssText = `
          width: 48px;
          height: 96px;
          object-fit: cover;
          object-position: center top;
          filter: drop-shadow(0 3px 8px rgba(0,0,0,0.4)) brightness(1.05) contrast(1.05);
          border-radius: 12px;
          ${isCurrentUser ? 'border: 3px solid #3b82f6;' : ''}
          ${inSameZone && !isCurrentUser ? `border: 2px solid ${markerColor};` : ''}
          ${isFriend ? 'border: 2px solid #10b981;' : ''}
          transition: transform 0.2s ease;
          display: block;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        `;

        avatarImg.onload = () => {
          console.log('✅ Direct image loaded successfully:', url);
          // Add hover animation
          avatarImg.addEventListener('mouseenter', () => {
            avatarImg.style.transform = 'scale(1.05)';
          });
          avatarImg.addEventListener('mouseleave', () => {
            avatarImg.style.transform = 'scale(1)';
          });
        };

        avatarImg.onerror = () => {
          console.log('❌ Direct image also failed, using enhanced fallback');
          avatarImg.remove();
          createEnhancedFallback();
        };
        
        el.appendChild(avatarImg);
      }

      function createEnhancedFallback() {
        console.log('🎭 Creating enhanced Snapchat-style character');
        
        // Create a full character avatar similar to Snapchat
        const characterContainer = document.createElement('div');
        characterContainer.style.cssText = `
          width: 50px;
          height: 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          cursor: pointer;
          transition: transform 0.3s ease;
        `;
        
        // Character body with 3D effect
        const characterBody = document.createElement('div');
        characterBody.style.cssText = `
          width: 42px;
          height: 68px;
          background: linear-gradient(135deg, ${isCurrentUser ? '#3b82f6' : (inSameZone ? markerColor : '#6366f1')}, ${isCurrentUser ? '#1d4ed8' : (inSameZone ? '#047857' : '#4338ca')});
          border-radius: 50% 50% 50% 50% / 35% 35% 65% 65%;
          border: 2px solid white;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding-top: 8px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3);
        `;
        
        // Face
        const face = document.createElement('div');
        face.style.cssText = `
          width: 22px;
          height: 22px;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          margin-bottom: 3px;
          border: 1px solid rgba(255,255,255,0.4);
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          color: #374151;
        `;
        face.textContent = name.charAt(0).toUpperCase();
        
        // Body/torso
        const torso = document.createElement('div');
        torso.style.cssText = `
          width: 16px;
          height: 18px;
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8));
          border-radius: 40% 40% 60% 60%;
          margin-top: 1px;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
        `;
        
        // Left arm
        const leftArm = document.createElement('div');
        leftArm.style.cssText = `
          position: absolute;
          top: 28px;
          left: -6px;
          width: 10px;
          height: 3px;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border-radius: 50%;
          transform: rotate(-15deg);
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        `;
        
        // Right arm
        const rightArm = document.createElement('div');
        rightArm.style.cssText = `
          position: absolute;
          top: 28px;
          right: -6px;
          width: 10px;
          height: 3px;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border-radius: 50%;
          transform: rotate(15deg);
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        `;
        
        // Assemble character
        characterBody.appendChild(face);
        characterBody.appendChild(torso);
        characterBody.appendChild(leftArm);
        characterBody.appendChild(rightArm);
        
        // Location pin/feet
        const locationPin = document.createElement('div');
        locationPin.style.cssText = `
          position: absolute;
          bottom: -3px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 12px solid white;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        `;
        
        // Ready Player Me indicator
        const rpmIndicator = document.createElement('div');
        rpmIndicator.style.cssText = `
          position: absolute;
          top: -4px;
          right: -4px;
          width: 14px;
          height: 14px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          border: 2px solid white;
          font-size: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        rpmIndicator.innerHTML = '3D';
        
        // Assemble complete character
        characterContainer.appendChild(characterBody);
        characterContainer.appendChild(locationPin);
        characterContainer.appendChild(rpmIndicator);
        
        // Add hover animations
        characterContainer.addEventListener('mouseenter', () => {
          characterContainer.style.transform = 'scale(1.1) translateY(-2px)';
        });
        characterContainer.addEventListener('mouseleave', () => {
          characterContainer.style.transform = 'scale(1) translateY(0)';
        });
        
        characterContainer.title = `${name} (3D Avatar Character)`;
        el.appendChild(characterContainer);
      }

      // Add zone name badge
      if (zoneKey) {
        const zoneName = getZoneName(zoneKey);
        const zoneIndicator = document.createElement('div');
        zoneIndicator.style.cssText = `
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          background: ${inSameZone ? '#10b981' : '#6366f1'};
          color: white;
          border-radius: 8px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          border: 1px solid white;
        `;
        zoneIndicator.textContent = zoneName;
        el.appendChild(zoneIndicator);
      }

      console.log('Adding zone-based avatar marker for:', name, 'Zone:', zoneKey, 'Same zone:', inSameZone);

    // Create enhanced popup with zone-based friend request functionality
    const zoneName = zoneKey ? getZoneName(zoneKey) : 'Unknown';
    let popupContent = `
      <div class="p-3 bg-white rounded-lg shadow-lg min-w-[200px]">
        <h3 class="font-semibold text-gray-900 mb-1">${name}</h3>
        <p class="text-sm text-gray-600 mb-2">${isCurrentUser ? 'Your zone' : (isFriend ? 'Friend nearby' : 'Person nearby')}</p>
        <p class="text-xs text-gray-500">${avatarUrl ? '✨ Ready Player Me Avatar' : '🎭 Default Avatar'}</p>
        <p class="text-xs text-blue-600 mt-1">🏠 Zone: ${zoneName}</p>`;

    // Add friend request button only for non-friends in the SAME zone (real users only)
    if (!isCurrentUser && !isFriend && user && inSameZone && !userId.startsWith('test-')) {
      popupContent += `
        <button 
          onclick="window.sendFriendRequest('${userId}')" 
          class="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded transition-colors"
        >
          🤝 Add Friend (Same Zone)
        </button>`;
    } else if (!isCurrentUser && !isFriend && user && zoneKey && !inSameZone) {
      const targetZoneName = getZoneName(zoneKey);
      popupContent += `
        <div class="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
          🏠 Move to zone ${targetZoneName} to send friend request
        </div>`;
    } else if (!isCurrentUser && !isFriend && user && !inSameZone) {
      popupContent += `
        <div class="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
          🚶‍♂️ Only users in the same zone can send friend requests
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

  // Separate function to render temporary events with unique IDs
  const renderTempEvents = () => {
    if (!map.current) return;
    
    console.log('Rendering temporary events:', tempEvents.length);
    
    tempEvents.forEach((event) => {
      if (event.latitude && event.longitude && event.isTemporary) {
        const tempEventId = `temp-${event.id}`;
        console.log('Creating temporary marker for:', event.title, 'with ID:', tempEventId);
        
        // Remove existing temporary marker if it exists
        if (eventMarkersRef.current[tempEventId]) {
          eventMarkersRef.current[tempEventId].remove();
          delete eventMarkersRef.current[tempEventId];
        }
        
        const eventElement = createEventMarker3D({
          event,
          attendeeCount: 0,
          currentUserId: user?.id,
          onEventClick: () => {
            // No click action needed for temp events, handled in marker
          },
          onEventPlace: async (eventId, lat, lng) => {
            console.log('Placing temporary event:', eventId, 'at', lat, lng);
            
            try {
              const { id, isTemporary, ...eventData } = event;
              const finalEventData = {
                ...eventData,
                start_time: eventData.start_time ? new Date(eventData.start_time).toISOString() : null,
                end_time: eventData.end_time ? new Date(eventData.end_time).toISOString() : null,
                latitude: lat,
                longitude: lng
              };

              console.log('Creating permanent event:', finalEventData);

              const { data: newEvent, error } = await supabase
                .from('events')
                .insert(finalEventData)
                .select()
                .single();

              if (error) {
                console.error('Error creating event:', error);
                toast({
                  title: "Error",
                  description: "Failed to create event",
                  variant: "destructive"
                });
                return;
              }

              if (newEvent) {
                await supabase
                  .from('event_attendees')
                  .insert({
                    event_id: newEvent.id,
                    user_id: user!.id,
                    status: 'going'
                  });
              }

              // Remove temporary event and its marker
              if (eventMarkersRef.current[tempEventId]) {
                eventMarkersRef.current[tempEventId].remove();
                delete eventMarkersRef.current[tempEventId];
              }
              setTempEvents(prev => prev.filter(e => e.id !== id));
              
              toast({
                title: "Event Created!",
                description: `${event.title} has been placed successfully`,
              });
            } catch (error) {
              console.error('Error placing event:', error);
              toast({
                title: "Error",
                description: "Failed to create event",
                variant: "destructive"
              });
            }
          },
          onEventDelete: (eventId) => {
            console.log('Cancelling temporary event:', eventId);
            // Remove marker and temp event
            if (eventMarkersRef.current[tempEventId]) {
              eventMarkersRef.current[tempEventId].remove();
              delete eventMarkersRef.current[tempEventId];
            }
            setTempEvents(prev => prev.filter(e => e.id !== event.id));
            toast({
              title: "Event Cancelled",
              description: "Event creation cancelled"
            });
          }
        });

        // Create completely stable marker for temporary events
        const marker = new mapboxgl.Marker({
          element: eventElement,
          anchor: 'bottom',
          draggable: false  // Never draggable
        })
          .setLngLat([event.longitude, event.latitude])
          .addTo(map.current!);

        // Make the entire element completely stable
        eventElement.style.pointerEvents = 'auto';
        eventElement.style.userSelect = 'none';
        eventElement.style.webkitUserSelect = 'none';
        
        // Prevent ALL drag/move events on the element
        const preventMovement = (e) => {
          e.preventDefault();
          e.stopPropagation();
        };
        
        ['dragstart', 'drag', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop'].forEach(eventType => {
          eventElement.addEventListener(eventType, preventMovement);
        });
        
        // Also prevent mouse/touch drag attempts
        eventElement.addEventListener('mousedown', (e) => {
          // Only prevent if not clicking on delete buttons
          const target = e.target as Element;
          if (!target.closest('[title*="Cancel"]') && !target.closest('[title*="Delete"]')) {
            e.preventDefault();
          }
        });

        eventMarkersRef.current[tempEventId] = marker;
        console.log('Added temporary marker with ID:', tempEventId);
      }
    });
  };
  // Re-render events when edit mode changes
  useEffect(() => {
    if (mapLoaded && map.current) {
      console.log('Edit mode changed, re-rendering events');
      loadNearbyEvents();
    }
  }, [editModeEvents, mapLoaded]);

  // Re-render temp events when tempEvents changes
  useEffect(() => {
    if (mapLoaded && map.current) {
      console.log('tempEvents changed, rendering temp events');
      renderTempEvents();
    }
  }, [tempEvents, mapLoaded]);

  // Load nearby users when map is ready
  useEffect(() => {
    if (mapLoaded && userLocation) {
      console.log('Map loaded, loading real users from Supabase...');
      loadRealUsers();
      loadNearbyEvents();
    }
  }, [mapLoaded, userLocation]);

  // Load nearby events with proper cleanup
  const loadNearbyEvents = async () => {
    if (!userLocation || !map.current) return;

    try {
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          *,
          event_attendees(count)
        `)
        .eq('is_public', true)
        .gte('start_time', new Date().toISOString()) // Only future events
        .limit(50);

      if (error) {
        console.error('Error loading events:', error);
        return;
      }

      setEvents(eventsData || []);
      
      // Properly clear existing PERMANENT event markers only (preserve temp events)
      Object.entries(eventMarkersRef.current).forEach(([eventId, marker]) => {
        // Only remove permanent events (temp events have different IDs starting with temp-)
        if (!eventId.startsWith('temp-')) {
          marker.remove();
          delete eventMarkersRef.current[eventId];
        }
      });

      console.log('About to render permanent events - eventsData:', eventsData?.length || 0);

      // Render ONLY permanent events from database (not temp events here)
      eventsData?.forEach((event) => {
        if (event.latitude && event.longitude && !eventMarkersRef.current[event.id]) {
          const attendeeCount = event.event_attendees?.[0]?.count || 0;
          console.log('Creating permanent marker for event:', event.title);
          
          const eventElement = createEventMarker3D({
            event: { ...event, isEditMode: editModeEvents.has(event.id) },
            attendeeCount,
            currentUserId: user?.id,
            onEventClick: (eventId) => {
              console.log('Event clicked:', eventId);
              if (!editModeEvents.has(eventId)) {
                toast({
                  title: `Event: ${event.title}`,
                  description: `${event.event_type} event - Click to join!`,
                });
              }
            },
            onToggleEditMode: (eventId) => {
              setEditModeEvents(prev => {
                const newSet = new Set(prev);
                if (newSet.has(eventId)) {
                  newSet.delete(eventId);
                  toast({
                    title: "Edit Mode Disabled",
                    description: "Event position locked"
                  });
                } else {
                  newSet.add(eventId);
                  toast({
                    title: "Edit Mode Enabled", 
                    description: "Click and drag to move event"
                  });
                }
                return newSet;
              });
            },
            onEventDelete: async (eventId) => {
              try {
                console.log('Deleting permanent event:', eventId);
                // First remove the marker immediately
                if (eventMarkersRef.current[eventId]) {
                  eventMarkersRef.current[eventId].remove();
                  delete eventMarkersRef.current[eventId];
                  console.log('Removed marker for event:', eventId);
                }
                
                await supabase.from('event_attendees').delete().eq('event_id', eventId);
                const { error } = await supabase.from('events').delete().eq('id', eventId);
                
                if (error) {
                  console.error('Error deleting event:', error);
                  toast({
                    title: "Error",
                    description: "Failed to delete event",
                    variant: "destructive"
                  });
                  // Re-add the marker if deletion failed
                  loadNearbyEvents();
                } else {
                  console.log('Event deleted successfully:', eventId);
                  // Remove from edit mode if it was there
                  setEditModeEvents(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(eventId);
                    return newSet;
                  });
                  toast({
                    title: "Event Deleted",
                    description: "Event removed successfully"
                  });
                }
              } catch (error) {
                console.error('Error deleting event:', error);
                toast({
                  title: "Error",
                  description: "Failed to delete event",
                  variant: "destructive"
                });
                // Re-add the marker if deletion failed
                loadNearbyEvents();
              }
            }
          });

          const marker = new mapboxgl.Marker({
            element: eventElement,
            anchor: 'bottom',
            draggable: editModeEvents.has(event.id) // Enable dragging only in edit mode
          })
            .setLngLat([event.longitude, event.latitude])
            .addTo(map.current!);

          // Handle drag events for position updates
          if (editModeEvents.has(event.id)) {
            marker.on('dragend', () => {
              const lngLat = marker.getLngLat();
              console.log('Event dragged to:', lngLat.lat, lngLat.lng);
              
              // Update event position in database
              supabase
                .from('events')
                .update({
                  latitude: lngLat.lat,
                  longitude: lngLat.lng,
                  updated_at: new Date().toISOString()
                })
                .eq('id', event.id)
                .then(({ error }) => {
                  if (error) {
                    console.error('Error updating event position:', error);
                    toast({
                      title: "Error",
                      description: "Failed to update event position",
                      variant: "destructive"
                    });
                    // Reset marker position on error
                    marker.setLngLat([event.longitude, event.latitude]);
                  } else {
                    toast({
                      title: "Position Updated",
                      description: "Event moved successfully"
                    });
                  }
                });
            });
          } else {
            // Prevent drag events when not in edit mode
            eventElement.addEventListener('dragstart', (e) => {
              e.preventDefault();
              e.stopPropagation();
            });
          }

          eventMarkersRef.current[event.id] = marker;
        }
      });
      
      console.log(`Added ${eventsData?.length || 0} permanent event markers to map`);
      
    } catch (error) {
      console.error('Error in loadNearbyEvents:', error);
    }
  };

  // Add debouncing for event updates to prevent excessive re-renders
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedLoadEvents = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (mapLoaded && userLocation) {
        loadNearbyEvents();
      }
    }, 300); // 300ms debounce
  };

  // Listen for new events with debouncing
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events'
        },
        (payload) => {
          console.log('New event created:', payload);
          debouncedLoadEvents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events'
        },  
        (payload) => {
          console.log('Event updated:', payload);
          debouncedLoadEvents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'events'
        },
        (payload) => {
          console.log('Event deleted:', payload);
          debouncedLoadEvents();
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [user, mapLoaded, userLocation]);

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
      
      {/* Map Controls - positioned below location toggle */}
      <div className="absolute top-20 left-2 space-y-1 z-20">
        <Button
          size="sm"
          onClick={getUserLocation}
          className="bg-white text-black hover:bg-gray-100 shadow-md text-xs h-8 px-2"
        >
          📍 My Location
        </Button>
      </div>

      {/* Small Zone Note - positioned on the right side */}
      {userLocation && Object.keys(userProfiles).length === 0 && showZoneNote && (
        <div className="absolute top-12 right-2 z-20 animate-fade-in">
          <div className="bg-background/95 backdrop-blur-sm border rounded-md p-1.5 shadow-md max-w-[160px]">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                <span className="text-xs font-medium truncate">Zone: {getZoneName('15038_6442')}</span>
              </div>
              <button
                onClick={() => setShowZoneNote(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 -m-0.5 flex-shrink-0"
                aria-label="Close notification"
              >
                <span className="text-xs font-bold leading-none">✕</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-tight">
              No users nearby
            </p>
          </div>
        </div>
      )}

      {/* Location Info - smaller */}
      {userLocation && (
        <Card className="absolute bottom-4 left-2 shadow-md z-20">
          <CardContent className="p-1">
            <p className="text-xs text-muted-foreground">
              {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};