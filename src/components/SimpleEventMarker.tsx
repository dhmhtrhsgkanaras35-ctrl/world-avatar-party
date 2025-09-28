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
  console.log('🔍 Debug info - currentUserId:', currentUserId, 'event.created_by:', event.created_by, 'isCreator:', currentUserId === event.created_by);
  console.log('🔍 Event details:', { id: event.id, title: event.title, isTemporary: event.isTemporary });

  const markerElement = document.createElement('div');
  markerElement.className = 'event-marker-container';
  
  // Get emoji for event type
  const emoji = EVENT_EMOJIS[event.event_type as keyof typeof EVENT_EMOJIS] || '📍';
  
  // Check if current user is the creator
  const isCreator = currentUserId === event.created_by;
  console.log('🔍 isCreator check:', { currentUserId, eventCreatedBy: event.created_by, isCreator });
  
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
    console.log('✅ Creating buttons for event creator:', event.id, 'user:', currentUserId);
    
    // Wait a tiny bit to ensure marker is fully rendered
    setTimeout(() => {
      // Create manage button as a completely separate element
      const manageButton = document.createElement('div');
      manageButton.style.cssText = `
        position: fixed;
        width: 28px;
        height: 28px;
        background-color: rgb(59, 130, 246);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        z-index: 999999;
        pointer-events: auto;
        border: 2px solid white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        user-select: none;
      `;
      manageButton.innerHTML = '⋯';
      manageButton.setAttribute('data-event-id', event.id);
      manageButton.setAttribute('data-button-type', 'manage');
      manageButton.title = 'Manage Event';
      
      // Create close button as a completely separate element
      const closeButton = document.createElement('div');
      closeButton.style.cssText = `
        position: fixed;
        width: 28px;
        height: 28px;
        background-color: rgb(239, 68, 68);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        z-index: 999999;
        pointer-events: auto;
        border: 2px solid white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        user-select: none;
      `;
      closeButton.innerHTML = '✕';
      closeButton.setAttribute('data-event-id', event.id);
      closeButton.setAttribute('data-button-type', 'close');
      closeButton.title = 'Close Event';

      // Position buttons relative to marker
      const updateButtonPositions = () => {
        const rect = markerElement.getBoundingClientRect();
        manageButton.style.left = (rect.left - 14) + 'px';
        manageButton.style.top = (rect.top - 14) + 'px';
        closeButton.style.left = (rect.right - 14) + 'px';
        closeButton.style.top = (rect.top - 14) + 'px';
      };

      // Add buttons to document body (not marker element)
      document.body.appendChild(manageButton);
      document.body.appendChild(closeButton);
      
      // Initial positioning
      updateButtonPositions();

      // Update positions when map moves
      const updatePositions = () => {
        requestAnimationFrame(updateButtonPositions);
      };
      
      map.on('move', updatePositions);
      map.on('zoom', updatePositions);

      // Store button cleanup function
      const cleanup = () => {
        map.off('move', updatePositions);
        map.off('zoom', updatePositions);
        if (manageButton.parentNode) manageButton.remove();
        if (closeButton.parentNode) closeButton.remove();
      };

      // Store cleanup function on marker element
      (markerElement as any)._buttonCleanup = cleanup;

      // Simple direct click handlers
      manageButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔧 MANAGE BUTTON CLICKED for event:', event.id);
        if (onManageEvent) {
          onManageEvent(event.id);
        }
      };

      closeButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔥 CLOSE BUTTON CLICKED for event:', event.id);
        if (onCloseEvent) {
          onCloseEvent(event.id);
        }
      };

      console.log('✅ Buttons created and positioned for event:', event.id);
    }, 100);
  } else {
    console.log('❌ Not creating buttons - isCreator:', isCreator, 'isTemporary:', event.isTemporary);
  }

  // Enhanced click handler for main event (only handle non-button clicks)
  markerElement.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Skip if clicking on buttons (check by data attributes now)
    if (target.getAttribute('data-button-type') || 
        target.closest('[data-button-type]')) {
      console.log('🚫 Skipping main click - button was clicked');
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

  // Store original remove function and override it to cleanup buttons
  const originalRemove = marker.remove.bind(marker);
  marker.remove = () => {
    // Cleanup buttons if they exist
    if ((markerElement as any)._buttonCleanup) {
      (markerElement as any)._buttonCleanup();
    }
    return originalRemove();
  };

  return marker;
};