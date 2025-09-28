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
import { createSimpleEventMarker } from "./SimpleEventMarker";
import { EventEmojiPalette } from "./EventEmojiPalette";

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

const EVENT_NAMES = {
  'house-party': 'House Party',
  'running': 'Running/Fitness',
  'concert': 'Concert/Music',
  'meetup': 'Meetup/Social',
  'sports': 'Sports',
  'food': 'Food & Drinks',
  'party': 'General Party',
  'gaming': 'Gaming',
  'study': 'Study Group'
};

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
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const eventMarkersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
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

        setMapboxToken(data.token);
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
        toast({
          title: "Map Error", 
          description: "Failed to load map configuration",
          variant: "destructive"
        });
      }
    };

    fetchMapboxToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    console.log('Initializing map with token:', mapboxToken);
    
    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-74.5, 40], // Default to New York area
        zoom: 9,
        projection: 'globe' as any,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        console.log('Map loaded successfully');
        setMapLoaded(true);
        getUserLocation();
      });

      // Add drag and drop functionality for emojis
      map.current.on('load', () => {
        if (map.current) {
          map.current.getContainer().addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'copy';
          });

          map.current.getContainer().addEventListener('drop', async (e) => {
            e.preventDefault();
            const eventType = e.dataTransfer!.getData('text/plain');
            
            if (!eventType || !user || !userLocation) return;

            // Get map coordinates from drop position
            const rect = map.current!.getContainer().getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const lngLat = map.current!.unproject([x, y]);

            // Create event at dropped location
            await createEventAtLocation(eventType, lngLat.lng, lngLat.lat);
          });
        }
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        title: "Map Error",
        description: "Failed to initialize map",
        variant: "destructive"
      });
    }
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
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            duration: 2000
          });

          loadNearbyEvents();
          loadRealUsers();
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        toast({
          title: "Location Error",
          description: "Unable to get your location",
          variant: "destructive"
        });
      }
    );
  };

  // Create event at specific location
  const createEventAtLocation = async (eventType: string, longitude: number, latitude: number) => {
    if (!user) return;

    try {
      const eventData = {
        title: `${EVENT_NAMES[eventType as keyof typeof EVENT_NAMES] || eventType}`,
        description: `A ${eventType} event`,
        event_type: eventType,
        latitude,
        longitude,
        created_by: user.id,
        is_public: true,
        start_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      };

      const { data: newEvent, error } = await supabase
        .from('events')
        .insert(eventData)
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
        // Auto-join the event
        await supabase
          .from('event_attendees')
          .insert({
            event_id: newEvent.id,
            user_id: user.id,
            status: 'going'
          });

        toast({
          title: "Event Created! 🎉",
          description: `Your ${eventType} event has been placed on the map`,
        });

        // Refresh events to show the new one
        loadNearbyEvents();
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive"
      });
    }
  };

  // Load nearby events
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
        .limit(50);

      if (error) {
        console.error('Error loading events:', error);
        return;
      }

      setEvents(eventsData || []);

      // Clear existing event markers
      Object.values(eventMarkersRef.current).forEach(marker => marker.remove());
      eventMarkersRef.current = {};

      // Create markers for events
      eventsData?.forEach((event) => {
        if (event.latitude && event.longitude) {
          const eventMarker = createSimpleEventMarker({
            event,
            map: map.current!,
            onClick: (eventId) => {
              toast({
                title: `Event: ${event.title}`,
                description: `${event.event_type} event - Click to join!`,
              });
            },
          });

          eventMarkersRef.current[event.id] = eventMarker;
        }
      });
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  // Load real users from Supabase
  const loadRealUsers = async () => {
    if (!user || !map.current) return;

    try {
      // First get user locations
      const { data: locations, error: locationsError } = await supabase
        .from('user_locations')
        .select('*')
        .eq('is_sharing', true)
        .neq('user_id', user.id);

      if (locationsError) {
        console.error('Error loading user locations:', locationsError);
        return;
      }

      if (!locations || locations.length === 0) return;

      // Get profiles for these users
      const userIds = locations.map(loc => loc.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, location_sharing_enabled, zone_key')
        .in('user_id', userIds)
        .eq('location_sharing_enabled', true);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        return;
      }

      // Clear existing user markers
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};

      // Create a map of profiles by user_id for easy lookup
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      locations?.forEach((location) => {
        const profile = profileMap.get(location.user_id);
        if (profile?.location_sharing_enabled) {
          addUserMarker(
            location.longitude,
            location.latitude,
            location.user_id,
            profile.display_name || 'User',
            false,
            profile.avatar_url,
            false,
            profile.zone_key,
            false,
            '#10b981'
          );
        }
      });
    } catch (error) {
      console.error('Error loading real users:', error);
    }
  };

  // Add user marker to map
  const addUserMarker = (
    lng: number, 
    lat: number, 
    userId: string, 
    displayName: string, 
    isCurrentUser: boolean, 
    avatarUrl?: string, 
    isFriend?: boolean, 
    zoneKey?: string | null, 
    isSameZone?: boolean, 
    color?: string
  ) => {
    if (!map.current) return;

    const markerId = isCurrentUser ? 'current-user' : userId;
    
    // Remove existing marker if it exists
    if (markersRef.current[markerId]) {
      markersRef.current[markerId].remove();
      delete markersRef.current[markerId];
    }

    const markerElement = document.createElement('div');
    markerElement.innerHTML = `
      <div class="relative">
        <div class="w-10 h-10 rounded-full border-2 overflow-hidden bg-white shadow-lg flex items-center justify-center ${
          isCurrentUser ? 'border-blue-500' : isFriend ? 'border-green-500' : 'border-gray-300'
        }">
          ${avatarUrl ? 
            `<img src="${avatarUrl}" class="w-full h-full object-cover" />` : 
            `<div class="text-lg">${displayName.charAt(0)}</div>`
          }
        </div>
        ${isCurrentUser ? `<div class="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>` : ''}
      </div>
    `;

    const marker = new mapboxgl.Marker({
      element: markerElement,
      anchor: 'bottom'
    })
    .setLngLat([lng, lat])
    .addTo(map.current);

    // Add popup
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <div class="p-2">
        <div class="font-medium">${displayName}</div>
        ${zoneKey ? `<div class="text-sm text-gray-500">Zone: ${getZoneName(zoneKey)}</div>` : ''}
        ${isFriend ? `<div class="text-sm text-green-600">✓ Friend</div>` : ''}
      </div>
    `);

    marker.setPopup(popup);
    markersRef.current[markerId] = marker;
  };

  return (
    <div className="w-full h-screen relative">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Zone sharing note */}
      {showZoneNote && (
        <Card className="absolute top-4 left-4 right-4 z-40 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <div className="text-sm">
                  <div className="font-medium text-blue-800">Zone-based social map</div>
                  <div className="text-blue-600">Find people and events in your area (~100m zones)</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowZoneNote(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Emoji Palette */}
      <EventEmojiPalette 
        user={user}
        userLocation={userLocation}
        userZone={userLocation ? getZoneName(`${Math.floor(userLocation.lat * 1000)}_${Math.floor(userLocation.lng * 1000)}`) : null}
      />

      {/* Instructions */}
      <Card className="fixed bottom-4 right-4 z-50 bg-background/95 backdrop-blur-sm">
        <CardContent className="p-3">
          <div className="text-xs font-medium text-muted-foreground">
            🎯 Drag emojis from palette to create events
          </div>
        </CardContent>
      </Card>
    </div>
  );
};