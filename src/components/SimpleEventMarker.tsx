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
  
  // Create the marker content with improved close button functionality
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
        min-w-[48px] min-h-[48px]
      ">
        ${emoji}
      </div>
      
      <!-- Enhanced Tooltip -->
      <div class="
        absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
        bg-black/90 text-white text-xs rounded-lg py-2 px-3
        opacity-0 group-hover:opacity-100 transition-opacity duration-300
        pointer-events-none whitespace-nowrap z-40 backdrop-blur-sm
      ">
        <div class="font-medium">${event.title}</div>
        ${event.isTemporary ? '<div class="text-blue-300">Click to place</div>' : ''}
        ${editMode ? '<div class="text-red-300">Click to delete</div>' : ''}
        ${isCreator && !event.isTemporary ? '<div class="text-yellow-300">⋯ = Manage • ✕ = Close</div>' : ''}
        <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/90"></div>
      </div>

      <!-- Pulse effect for temporary events -->
      ${event.isTemporary ? `
        <div class="absolute inset-0 rounded-full bg-blue-400 opacity-25 animate-ping pointer-events-none"></div>
      ` : ''}
    </div>
  `;

  // Add buttons separately if user is creator
  if (isCreator && !event.isTemporary) {
    // Create manage button
    const manageButton = document.createElement('button');
    manageButton.className = 'manage-event-btn absolute w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-110 cursor-pointer border border-white';
    manageButton.style.cssText = 'top: -8px; left: -28px; z-index: 10000; pointer-events: auto;';
    manageButton.innerHTML = '⋯';
    manageButton.title = 'Manage Event';
    markerElement.appendChild(manageButton);

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'close-event-btn absolute w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-110 cursor-pointer border border-white';
    closeButton.style.cssText = 'top: -8px; right: -8px; z-index: 10000; pointer-events: auto;';
    closeButton.innerHTML = '✕';
    closeButton.title = 'Close Event';
    markerElement.appendChild(closeButton);

    // Add direct event listeners to buttons
    manageButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔧 MANAGE BUTTON CLICKED for event:', event.id);
      if (onManageEvent) {
        onManageEvent(event.id);
      }
    });

    closeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔥 CLOSE BUTTON CLICKED for event:', event.id);
      if (onCloseEvent) {
        onCloseEvent(event.id);
      }
    });
  }

  // Enhanced click handler for main event (only handle non-button clicks)
  markerElement.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Skip if clicking on buttons
    if (target.classList.contains('manage-event-btn') || 
        target.classList.contains('close-event-btn') ||
        target.closest('.manage-event-btn') ||
        target.closest('.close-event-btn')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    console.log('🎪 Main event click for:', event.id);
    
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