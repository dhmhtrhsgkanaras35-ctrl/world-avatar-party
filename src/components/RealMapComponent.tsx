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
  userLocation?: { lat: number; lng: number } | null;
  userZone?: string | null;
}

export const RealMapComponent = ({ showEmojiPalette = false, userLocation: propUserLocation, userZone: propUserZone }: RealMapComponentProps = {}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
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
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12', // Colorful street style for party vibes
        center: [2.3522, 48.8566], // Default to Paris - more interesting than NYC
        zoom: 3, // Wider view initially
        projection: 'globe' as any,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        console.log('Map loaded successfully');
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
    if (!user) return;

    try {
      const { error } = await supabase
        .from('events')
        .update({
          is_closed: true,
          closed_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .eq('created_by', user.id); // Make sure only creator can close

      if (error) {
        console.error('Error closing event:', error);
        toast({
          title: "Error",
          description: "Failed to close event",
          variant: "destructive"
        });
        return;
      }

      // Remove the event marker from map
      if (eventMarkersRef.current[eventId]) {
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
      console.error('Error closing event:', error);
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
        .select('user_id, display_name, avatar_url, location_sharing_enabled, zone_key')
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

      // Create a map of profiles by user_id for easy lookup
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

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
        const profile = profileMap.get(location.user_id);
        if (profile?.location_sharing_enabled) {
          const isFriend = friendUserIds.has(location.user_id);
          console.log('Adding user marker:', {
            userId: location.user_id,
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
            isFriend
          });
          addUserMarker(
            location.longitude,
            location.latitude,
            location.user_id,
            profile.display_name || 'User',
            false,
            profile.avatar_url,
            isFriend,
            profile.zone_key,
            false,
            isFriend ? '#10b981' : '#6b7280'
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

    // Create marker element with avatar
    const markerElement = document.createElement('div');
    markerElement.className = 'marker-container';
    
    const avatarContainer = document.createElement('div');
    const borderClass = isCurrentUser 
      ? 'border-blue-500 ring-2 ring-blue-200' 
      : isFriend 
      ? 'border-green-500 ring-2 ring-green-200' 
      : 'border-gray-400';
    
    const initials = displayName.charAt(0).toUpperCase();
    
    avatarContainer.innerHTML = `
      <div class="relative">
        <div class="w-12 h-12 rounded-full border-2 overflow-hidden bg-white shadow-xl flex items-center justify-center transition-transform hover:scale-110 ${borderClass}">
          <div class="text-lg font-bold text-gray-700" id="avatar-${userId}">${initials}</div>
        </div>
        ${isCurrentUser ? '<div class="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>' : ''}
        ${isFriend && !isCurrentUser ? '<div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>' : ''}
      </div>
    `;

    // Try to load avatar image if available
    if (avatarUrl) {
      const img = new Image();
      // Don't use crossOrigin for ReadyPlayerMe URLs
      
      img.onload = () => {
        const avatarEl = document.getElementById(`avatar-${userId}`);
        if (avatarEl && avatarEl.parentElement) {
          avatarEl.parentElement.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover" alt="${displayName}" />`;
        }
      };
      
      img.onerror = () => {
        // Silently fall back to initials - no console spam
      };
      
      img.src = avatarUrl;
    }
    
    markerElement.appendChild(avatarContainer);

    const marker = new mapboxgl.Marker({
      element: markerElement,
      anchor: 'bottom'
    })
    .setLngLat([lng, lat])
    .addTo(map.current);

    // Create popup content
    let popupContent = `
      <div class="p-4 min-w-[220px] bg-white rounded-lg shadow-lg">
        <div class="flex items-center gap-3 mb-3">
          ${avatarUrl ? 
            `<img src="${avatarUrl}" class="w-10 h-10 rounded-full object-cover border-2 ${isCurrentUser ? 'border-blue-500' : isFriend ? 'border-green-500' : 'border-gray-300'}" alt="${displayName}" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="console.error('Failed to load popup avatar:', '${avatarUrl}'); this.style.display='none';" />` :
            `<div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-700 border-2 ${isCurrentUser ? 'border-blue-500' : isFriend ? 'border-green-500' : 'border-gray-300'}">${displayName.charAt(0).toUpperCase()}</div>`
          }
          <div>
            <div class="font-semibold text-gray-900 text-base">${displayName}</div>
            ${isCurrentUser ? '<div class="text-xs text-blue-600 font-medium">This is you</div>' : ''}
          </div>
        </div>
    `;

    if (zoneKey) {
      popupContent += `
        <div class="text-sm text-gray-700 mb-3 bg-gray-50 p-2 rounded">
          <span class="font-medium">Zone:</span> ${getZoneName(zoneKey)}
        </div>`;
    }

    if (!isCurrentUser && !isFriend) {
      popupContent += `
        <div class="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
          🚶‍♂️ Only users in the same zone can send friend requests
        </div>`;
    }

    if (isFriend) {
      popupContent += `
        <div class="mt-2 text-sm text-green-700 font-medium flex items-center gap-2 bg-green-50 p-2 rounded">
          <span class="text-green-500">✓</span> Friend
        </div>`;
    } else if (!isCurrentUser) {
      popupContent += `
        <div class="mt-2 text-xs text-gray-600 flex items-center gap-1 bg-gray-50 p-2 rounded">
          <span>📍</span> Zone-based location (~100m)
        </div>`;
    }

    popupContent += `</div>`;

    const popup = new mapboxgl.Popup({ 
      offset: 25,
      closeButton: true,
      closeOnClick: false 
    }).setHTML(popupContent);

    marker.setPopup(popup);
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
      {showEmojiPalette && (
        <EventEmojiPalette 
          user={user}
          userLocation={userLocation}
          userZone={propUserZone || (userLocation ? getZoneName(`${Math.floor(userLocation.lat * 1000)}_${Math.floor(userLocation.lng * 1000)}`) : null)}
        />
      )}

      {/* Instructions */}
      {showEmojiPalette && (
        <Card className="fixed bottom-4 right-4 z-50 bg-white/95 backdrop-blur-sm border shadow-lg">
          <CardContent className="p-3">
            <div className="text-xs font-medium text-gray-700">
              🎯 Drag emojis from palette to create events
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Chat Button */}
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
          className="fixed bottom-4 right-4 z-50 rounded-full w-12 h-12"
          size="sm"
        >
          💬
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