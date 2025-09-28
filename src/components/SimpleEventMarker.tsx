import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import mapboxgl from 'mapbox-gl';

interface SimpleEventMarkerProps {
  event: {
    id: string;
    title: string;
    event_type: string;
    latitude: number;
    longitude: number;
    start_time?: string;
    max_attendees?: number;
    created_by: string;
    isTemporary?: boolean;
  };
  map: mapboxgl.Map;
  currentUserId?: string;
  onClick?: (eventId: string) => void;
  onToggleEditMode?: (eventId: string) => void;
  onCloseEvent?: (eventId: string) => void;
  onManageEvent?: (eventId: string) => void;
  editMode?: boolean;
}

const EVENT_EMOJIS = {
  'house-party': '🏠🔊',
  'running': '🏃‍♂️',
  'concert': '🎵🎤', 
  'meetup': '🤝🗣️',
  'sports': '⚽🏃‍♀️',
  'food': '🍕🍻',
  'party': '🎉🎪',
  'gaming': '🎮🕹️',
  'study': '📚✏️'
};

export const createSimpleEventMarker = ({
  event,
  map,
  currentUserId,
  onClick,
  onToggleEditMode,
  onCloseEvent,
  onManageEvent,
  editMode = false
}: SimpleEventMarkerProps) => {
  console.log('Creating simple event marker for:', event.title, 'type:', event.event_type);

  const markerElement = document.createElement('div');
  markerElement.className = 'event-marker-container';
  
  // Get emoji for event type
  const emoji = EVENT_EMOJIS[event.event_type as keyof typeof EVENT_EMOJIS] || '📍';
  
  // Check if current user is the creator
  const isCreator = currentUserId === event.created_by;
  
  // Create the marker content
  markerElement.innerHTML = `
    <div class="relative group cursor-pointer">
      <div class="
        ${event.isTemporary ? 'animate-pulse' : ''}
        ${editMode ? 'animate-bounce' : ''}
        bg-white rounded-full p-2 shadow-lg border-2 
        ${event.isTemporary ? 'border-blue-400' : 'border-gray-200'}
        ${editMode ? 'border-red-400' : ''}
        hover:shadow-xl transition-all duration-200 hover:scale-110
        flex items-center justify-center text-2xl relative
      ">
        ${emoji}
        ${isCreator && !event.isTemporary ? `
          <button class="manage-event-btn absolute -top-1 -right-1 w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110" title="Manage Event">
            ⋯
          </button>
          <button class="close-event-btn absolute -top-1 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110 translate-x-6" title="Close Event">
            ✕
          </button>
        ` : ''}
      </div>
      
      <!-- Tooltip -->
      <div class="
        absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
        bg-black text-white text-xs rounded py-1 px-2
        opacity-0 group-hover:opacity-100 transition-opacity
        pointer-events-none whitespace-nowrap z-50
      ">
        ${event.title}
        ${event.isTemporary ? ' (Click to place)' : ''}
        ${editMode ? ' (Click to delete)' : ''}
        ${isCreator && !event.isTemporary ? ' - You can close this event' : ''}
      </div>

      <!-- Pulse effect for temporary events -->
      ${event.isTemporary ? `
        <div class="absolute inset-0 rounded-full bg-blue-400 opacity-25 animate-ping"></div>
      ` : ''}
    </div>
  `;

  // Add click handler for the main marker
  markerElement.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Check if the click was on the close button
    if (target.classList.contains('close-event-btn')) {
      e.stopPropagation();
      if (isCreator && onCloseEvent) {
        console.log('Closing event:', event.id);
        onCloseEvent(event.id);
      }
      return;
    }

    // Check if the click was on the manage button
    if (target.classList.contains('manage-event-btn')) {
      e.stopPropagation();
      if (isCreator && onManageEvent) {
        console.log('Managing event:', event.id);
        onManageEvent(event.id);
      }
      return;
    }
    
    e.stopPropagation();
    console.log('Event marker clicked:', event.id);
    
    if (editMode && onToggleEditMode) {
      onToggleEditMode(event.id);
    } else if (onClick) {
      onClick(event.id);
    }
  });

  // Create and return the Mapbox marker
  const marker = new mapboxgl.Marker({
    element: markerElement,
    anchor: 'bottom'
  })
  .setLngLat([event.longitude, event.latitude])
  .addTo(map);

  return marker;
};