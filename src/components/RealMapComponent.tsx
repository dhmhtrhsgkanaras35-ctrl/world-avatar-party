import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { getZoneName } from "@/utils/zoneNames";
import { createSimpleEventMarker } from "./SimpleEventMarker";
import { EventEmojiPalette } from "./EventEmojiPalette";
import { EventJoinDialog } from "./EventJoinDialog";
import { EventManagementDialog } from "./EventManagementDialog";
import { EventChatDialog } from "./EventChatDialog";

interface UserLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  is_sharing: boolean;
  profile?: {
    username: string;
    display_name: string;
    emoji: string;
    emoji_color: string;
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
  is_closed: boolean;
  description?: string;
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

interface RealMapComponentProps {
  showEmojiPalette?: boolean;
  onToggleEmojiPalette?: () => void;
  userLocation?: { lat: number; lng: number } | null;
  userZone?: string | null;
}

export const RealMapComponent = ({ showEmojiPalette = false, onToggleEmojiPalette, userLocation: propUserLocation, userZone: propUserZone }: RealMapComponentProps = {}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(propUserLocation || null);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: any}>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [showZoneNote, setShowZoneNote] = useState(true);
  const [selectedEventForJoin, setSelectedEventForJoin] = useState<Event | null>(null);
  const [selectedEventForManagement, setSelectedEventForManagement] = useState<Event | null>(null);
  const [selectedEventForChat, setSelectedEventForChat] = useState<Event | null>(null);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showManagementDialog, setShowManagementDialog] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
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
      // Set the access token on the global mapboxgl object
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12', // Colorful street style for party vibes
        center: [2.3522, 48.8566], // Default to Paris - more interesting than NYC
        zoom: 3, // Wider view initially
        projection: 'globe' as any,
        // Performance optimizations for faster LCP
        antialias: false, // Disable for faster initial render
        renderWorldCopies: false,
        maxTileCacheSize: 50, // Reduce memory usage
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        console.log('Map loaded successfully');
        console.log('Map container dimensions:', mapContainer.current?.offsetWidth, mapContainer.current?.offsetHeight);
        // Critical: Resize map to fit container properly for LCP
        setTimeout(() => {
          map.current?.resize();
          console.log('Map resized to fit container');
          if (mapContainer.current) {
            console.log('After resize - Container:', mapContainer.current.offsetWidth, mapContainer.current.offsetHeight);
          }
          // Mark LCP candidate as ready
          performance.mark('map-lcp-ready');
        }, 50); // Reduced timeout for faster LCP
        setMapLoaded(true);
        getUserLocation();
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e.error);
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

  // Real-time event updates
  useEffect(() => {
    if (!user) return;

    // Subscribe to new events being created
    const eventChannel = supabase
      .channel('event-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: 'is_public=eq.true'
        },
        (payload) => {
          console.log('🆕 New event created:', payload.new);
          const newEvent = payload.new as Event;
          
          // Add the new event to the map if it's not temporary
          if (newEvent.latitude && newEvent.longitude && !newEvent.is_closed) {
            setEvents(prev => [...prev, newEvent]);
            
            // Create marker for the new event
            if (map.current) {
              const eventMarker = createSimpleEventMarker({
                event: newEvent,
                map: map.current,
                currentUserId: user.id,
                onCloseEvent: handleCloseEvent,
                onManageEvent: handleManageEvent,
                onClick: (eventId) => {
                  const clickedEvent = events.find(e => e.id === eventId) || newEvent;
                  if (clickedEvent) {
                    handleEventClick(clickedEvent);
                  }
                },
              });
              
              eventMarkersRef.current[newEvent.id] = eventMarker;
            }
          }
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
          console.log('📝 Event updated:', payload.new);
          const updatedEvent = payload.new as Event;
          
          // Update local events state
          setEvents(prev => prev.map(event => 
            event.id === updatedEvent.id ? updatedEvent : event
          ));
          
          // If event was closed, remove its marker
          if (updatedEvent.is_closed && eventMarkersRef.current[updatedEvent.id]) {
            eventMarkersRef.current[updatedEvent.id].remove();
            delete eventMarkersRef.current[updatedEvent.id];
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventChannel);
    };
  }, [user]);

  // Listen for profile updates (location sharing changes)
  useEffect(() => {
    if (!user) return;

    // Listen for custom events from LocationToggle
    const handleLocationSharingEnabled = (event: CustomEvent) => {
      console.log('Location sharing enabled event:', event.detail);
      const { latitude, longitude } = event.detail;
      
      // Re-fetch user's emoji from Supabase and add marker
      if (map.current && user) {
        console.log('Re-fetching user profile for location sharing');
        supabase
          .from('profiles')
          .select('emoji, emoji_color, display_name')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data: userProfile }) => {
            console.log('User profile for marker:', userProfile);
            const profile = userProfile as any; // Type workaround until types regenerate
            
            addUserMarker(
              longitude,
              latitude,
              user.id,
              profile?.display_name || user.user_metadata?.display_name || 'You',
              true,
              profile?.emoji || '🙂',
              false,
              null, // Will be set after blur calculation
              false,
              profile?.emoji_color || '#3b82f6'
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

  // Add drag and drop functionality for emojis
  useEffect(() => {
    if (!map.current) return;

    const mapContainer = map.current.getContainer();

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      const eventType = e.dataTransfer!.getData('text/plain');
      
      if (!eventType || !user || !userLocation) return;

      // Get map coordinates from drop position
      const rect = mapContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const lngLat = map.current!.unproject([x, y]);

      // Create event at dropped location
      await createEventAtLocation(eventType, lngLat.lng, lngLat.lat);
    };

    mapContainer.addEventListener('dragover', handleDragOver);
    mapContainer.addEventListener('drop', handleDrop);

    return () => {
      mapContainer.removeEventListener('dragover', handleDragOver);
      mapContainer.removeEventListener('drop', handleDrop);
    };
  }, [user, userLocation]);

  // Get user's current location with better permission handling
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support location services",
        variant: "destructive"
      });
      return;
    }

    // First try to check permission status
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        console.log('Geolocation permission:', result.state);
        
        if (result.state === 'denied') {
          toast({
            title: "Location Permission Denied",
            description: "Please enable location access in your browser settings to see your position on the map",
            variant: "destructive"
          });
          return;
        }
        
        // Proceed with location request
        requestLocation();
      }).catch(() => {
        // Fallback if permissions API not supported
        requestLocation();
      });
    } else {
      // Fallback for browsers without permissions API
      requestLocation();
    }
  };

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lng: longitude };
        setUserLocation(location);

        if (map.current && user) {
          console.log('Getting location for user:', user.id);
          
          // Center map on user's actual location
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            duration: 2000
          });
          
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

          // Only add user marker if they are sharing location
          if (isSharing) {
            console.log('Adding user marker because sharing is enabled');
            // Get user's emoji from profile and add marker
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('emoji, emoji_color, display_name')
              .eq('user_id', user.id)
              .maybeSingle();

            console.log('User profile for marker:', userProfile);
            console.log('Adding marker at coordinates:', longitude, latitude);
            
            const profile = userProfile as any; // Type workaround until types regenerate

            addUserMarker(
              longitude, 
              latitude, 
              user.id, 
              profile?.display_name || 'You', 
              true, 
              profile?.emoji || '🙂',
              false, // Current user is not a "friend" to themselves
              blurred?.zone_key,
              false, // Current user is not in same zone as themselves
              profile?.emoji_color || '#3b82f6'
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

          loadNearbyEvents();
          loadRealUsers();
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        
        let errorMessage = "Could not get your location. ";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Location access was denied. Please enable location permissions in your browser.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out.";
            break;
          default:
            errorMessage += "An unknown error occurred.";
            break;
        }
        
        toast({
          title: "Location Access Needed",
          description: errorMessage,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000 // 5 minutes
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
        .eq('is_closed', false) // Only show open events
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
            currentUserId: user?.id, // Pass current user ID
            onCloseEvent: handleCloseEvent,
            onManageEvent: handleManageEvent,
            onClick: (eventId) => {
              const clickedEvent = eventsData?.find(e => e.id === eventId);
              if (clickedEvent) {
                handleEventClick(clickedEvent);
              }
            },
          });

          eventMarkersRef.current[event.id] = eventMarker;
        }
      });
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  // Handle event click for joining
  const handleEventClick = (event: Event) => {
    if (event.created_by === user?.id) {
      // If user is the creator, open management dialog
      setSelectedEventForManagement(event);
      setShowManagementDialog(true);
    } else {
      // If user is not the creator, open join dialog
      setSelectedEventForJoin(event);
      setShowJoinDialog(true);
    }
  };

  // Handle event management
  const handleManageEvent = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEventForManagement(event);
      setShowManagementDialog(true);
    }
  };

  // Handle joining an event
  const handleJoinRequested = () => {
    toast({
      title: "Join Request Sent! 📩",
      description: "The event organizer will review your request",
    });
  };

  // Handle event updates
  const handleEventUpdated = () => {
    loadNearbyEvents(); // Reload events to get updated data
  };

  // Handle opening event chat
  const handleOpenEventChat = (event: Event) => {
    setSelectedEventForChat(event);
    setShowChatDialog(true);
  };

  // Handle closing an event
  const handleCloseEvent = async (eventId: string) => {
    console.log('🔥 handleCloseEvent called for:', eventId);
    if (!user) {
      console.error('❌ No user found for closing event');
      return;
    }

    try {
      console.log('🔄 Attempting to close event:', eventId, 'by user:', user.id);
      const { error } = await supabase
        .from('events')
        .update({
          is_closed: true,
          closed_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .eq('created_by', user.id); // Make sure only creator can close

      if (error) {
        console.error('❌ Error closing event:', error);
        toast({
          title: "Error",
          description: "Failed to close event",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Event closed successfully in database');

      // Remove the event marker from map
      if (eventMarkersRef.current[eventId]) {
        console.log('🗺️ Removing event marker from map');
        eventMarkersRef.current[eventId].remove();
        delete eventMarkersRef.current[eventId];
      }

      // Update local events state
      setEvents(prev => prev.filter(event => event.id !== eventId));

      toast({
        title: "Event Closed! 🏁",
        description: "Your event has been closed and removed from the map",
      });

    } catch (error) {
      console.error('❌ Error closing event:', error);
      toast({
        title: "Error", 
        description: "Failed to close event",
        variant: "destructive"
      });
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
        .select('user_id, display_name, emoji, emoji_color, location_sharing_enabled, zone_key')
        .in('user_id', userIds)
        .eq('location_sharing_enabled', true);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        return;
      }

      // Clear existing user markers (except current user)
      Object.entries(markersRef.current).forEach(([markerId, marker]) => {
        if (markerId !== 'current-user') {
          marker.remove();
          delete markersRef.current[markerId];
        }
      });

      // Create a map of profiles by user_id for easy lookup (with type workaround)
      const profileMap = new Map((profiles as any[])?.map(p => [p.user_id, p]) || []);

      // Check friendships for all users at once
      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .eq('status', 'accepted');

      const friendUserIds = new Set(
        friendships?.map(f => 
          f.requester_id === user.id ? f.recipient_id : f.requester_id
        ) || []
      );

      locations?.forEach((location) => {
        const profile = profileMap.get(location.user_id) as any; // Type workaround
        if (profile?.location_sharing_enabled) {
          const isFriend = friendUserIds.has(location.user_id);
          console.log('Adding user marker:', {
            userId: location.user_id,
            displayName: profile.display_name,
            emoji: profile.emoji,
            emojiColor: profile.emoji_color,
            isFriend
          });
          addUserMarker(
            location.longitude,
            location.latitude,
            location.user_id,
            profile.display_name || 'User',
            false,
            profile.emoji || '🙂',
            isFriend,
            profile.zone_key,
            false,
            profile.emoji_color || '#3B82F6'
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
    emoji?: string, 
    isFriend?: boolean, 
    zoneKey?: string | null, 
    isSameZone?: boolean, 
    emojiColor?: string
  ) => {
    if (!map.current) return;

    const markerId = isCurrentUser ? 'current-user' : userId;
    
    // Remove existing marker if it exists
    if (markersRef.current[markerId]) {
      markersRef.current[markerId].remove();
      delete markersRef.current[markerId];
    }

    // Create marker element with emoji avatar
    const markerElement = document.createElement('div');
    markerElement.className = 'marker-container relative flex items-end justify-center';
    
    // Set z-index for proper layering: current user on top, then friends, then others
    const zIndex = isCurrentUser ? 1000 : (isFriend ? 900 : 800);
    markerElement.style.zIndex = zIndex.toString();
    markerElement.style.position = 'relative';
    markerElement.style.pointerEvents = 'none';
    
    const displayEmoji = emoji || '🙂';
    const backgroundColor = emojiColor || '#3B82F6';
    
    // Create emoji avatar container
    const avatarContainer = document.createElement('div');
    avatarContainer.innerHTML = `
      <div class="relative flex flex-col items-center" style="z-index: ${zIndex};">
        <div class="w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 border-white" style="background-color: ${backgroundColor}; z-index: ${zIndex + 1};">
          <span class="text-2xl select-none">${displayEmoji}</span>
        </div>
        ${isCurrentUser ? `<div class="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" style="z-index: ${zIndex + 2};"></div>` : ''}
        ${isFriend && !isCurrentUser ? `<div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg" style="z-index: ${zIndex + 2};"></div>` : ''}
        <div class="mt-1 px-2 py-0.5 bg-black/75 text-white text-xs rounded max-w-20 truncate">
          ${displayName}
        </div>
      </div>
    `;
    
    markerElement.appendChild(avatarContainer);
    const marker = new mapboxgl.Marker({
      element: markerElement,
      anchor: 'bottom', // Anchor at bottom for proper positioning
      offset: [0, 2], // Small offset for perfect alignment
      scale: 1 // Disable scaling with zoom level
    })
    .setLngLat([lng, lat])
    .addTo(map.current);

    // No popup for user markers - user requested removal
    markersRef.current[markerId] = marker;

    console.log(`Added marker for ${displayName} at [${lng}, ${lat}]`);
  };

  // Load nearby users and events when map is ready
  useEffect(() => {
    if (mapLoaded && userLocation) {
      console.log('Map loaded, loading real users from Supabase...');
      loadRealUsers();
      loadNearbyEvents();
    }
  }, [mapLoaded, userLocation]);

  // Add window resize handler to ensure map resizes properly
  useEffect(() => {
    const handleResize = () => {
      if (map.current) {
        map.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Zone sharing note - Mobile optimized */}
      {showZoneNote && (
        <Card className="absolute top-4 left-2 right-2 z-40 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">📍</span>
                <div className="text-xs">
                  <div className="font-medium text-blue-800">Zone-based social map</div>
                  <div className="text-blue-600">Find people and events nearby</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowZoneNote(false)}
                className="text-blue-600 hover:text-blue-800 h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Emoji Palette - Mobile optimized */}
      {showEmojiPalette && (
        <div className="fixed bottom-20 left-2 z-50">
          <EventEmojiPalette 
            user={user}
            userLocation={userLocation}
            userZone={propUserZone || (userLocation ? getZoneName(`${Math.floor(userLocation.lat * 1000)}_${Math.floor(userLocation.lng * 1000)}`) : null)}
            onClose={onToggleEmojiPalette}
          />
        </div>
      )}

      {/* Instructions - Mobile optimized */}
      {showEmojiPalette && (
        <Card className="fixed bottom-20 right-2 z-50 bg-white/95 backdrop-blur-sm border shadow-lg max-w-[140px]">
          <CardContent className="p-2">
            <div className="text-xs font-medium text-gray-700 text-center">
              🎯 Drag emojis to create events
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Chat Button - Moved up for mobile */}
      {!showEmojiPalette && (
        <Button
          onClick={() => {
            const userEvent = events.find(e => e.created_by === user?.id);
            if (userEvent) {
              handleOpenEventChat(userEvent);
            } else {
              toast({
                title: "No Event",
                description: "You need to create or join an event to access chat",
                variant: "destructive"
              });
            }
          }}
          className="fixed bottom-20 right-4 z-50 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
          size="sm"
        >
          <span className="text-2xl">💬</span>
        </Button>
      )}

      {/* Event Dialogs */}
      <EventJoinDialog
        event={selectedEventForJoin}
        user={user}
        isOpen={showJoinDialog}
        onClose={() => setShowJoinDialog(false)}
        onJoinRequested={handleJoinRequested}
      />

      <EventManagementDialog
        event={selectedEventForManagement}
        user={user}
        isOpen={showManagementDialog}
        onClose={() => setShowManagementDialog(false)}
        onEventUpdated={handleEventUpdated}
      />

      <EventChatDialog
        event={selectedEventForChat}
        user={user}
        isOpen={showChatDialog}
        onClose={() => setShowChatDialog(false)}
      />
    </div>
  );
};