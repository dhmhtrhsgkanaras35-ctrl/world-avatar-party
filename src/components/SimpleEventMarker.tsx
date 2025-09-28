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
  markerElement.className = 'event-marker-container relative';
  markerElement.style.zIndex = '500'; // Lower than dialogs but higher than map
  
  // Get emoji for event type
  const emoji = EVENT_EMOJIS[event.event_type as keyof typeof EVENT_EMOJIS] || '📍';
  
  // Check if current user is the creator
  const isCreator = currentUserId === event.created_by;
  console.log('🔍 isCreator check:', { currentUserId, eventCreatedBy: event.created_by, isCreator });
  
  // Create the main marker with inline buttons for creators
  markerElement.innerHTML = `
    <div class="relative group cursor-pointer">
      <!-- Event marker -->
      <div class="
        ${event.isTemporary ? 'animate-pulse' : ''}
        ${editMode ? 'animate-bounce' : ''}
        bg-white rounded-full p-1.5 shadow-lg border-2 
        ${event.isTemporary ? 'border-blue-400' : 'border-gray-200'}
        ${editMode ? 'border-red-400' : ''}
        hover:shadow-xl transition-all duration-200 hover:scale-110
        flex items-center justify-center text-lg relative
        min-w-[36px] min-h-[36px]
      " data-event-main="true">
        ${emoji}
      </div>
      
      <!-- Action buttons for creators -->
      ${isCreator && !event.isTemporary ? `
        <button 
          class="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full 
                 flex items-center justify-center text-xs font-bold transition-all duration-150 
                 border-2 border-white shadow-lg hover:shadow-xl hover:scale-110 z-10"
          data-action="manage"
          title="Manage Event"
          style="pointer-events: auto;"
        >⋯</button>
        
        <button 
          class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full 
                 flex items-center justify-center text-xs font-bold transition-all duration-150 
                 border-2 border-white shadow-lg hover:shadow-xl hover:scale-110 z-10"
          data-action="close"
          title="Close Event"
          style="pointer-events: auto;"
        >✕</button>
      ` : ''}
      
      <!-- Tooltip -->
      <div class="
        absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
        bg-black/90 text-white text-xs rounded-lg py-2 px-3
        opacity-0 group-hover:opacity-100 transition-opacity duration-300
        pointer-events-none whitespace-nowrap z-50 backdrop-blur-sm
      ">
        <div class="font-medium">${event.title}</div>
        ${event.isTemporary ? '<div class="text-blue-300">Click to place</div>' : ''}
        ${editMode ? '<div class="text-red-300">Click to delete</div>' : ''}
        ${isCreator && !event.isTemporary ? '<div class="text-yellow-300">Manage or close event</div>' : ''}
        <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/90"></div>
      </div>

      <!-- Pulse effect for temporary events -->
      ${event.isTemporary ? `
        <div class="absolute inset-0 rounded-full bg-blue-400 opacity-25 animate-ping pointer-events-none"></div>
      ` : ''}
    </div>
  `;

  // Add click handler
  markerElement.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.target as HTMLElement;
    const action = target.getAttribute('data-action');
    
    console.log('🎯 Marker clicked:', { eventId: event.id, action, target });
    
    if (action === 'manage') {
      console.log('🔧 Manage button clicked for event:', event.id);
      if (onManageEvent) {
        onManageEvent(event.id);
      }
    } else if (action === 'close') {
      console.log('🔥 Close button clicked for event:', event.id);
      if (onCloseEvent) {
        onCloseEvent(event.id);
      }
    } else if (target.getAttribute('data-event-main') || target.closest('[data-event-main]')) {
      console.log('🎪 Main event click for:', event.id);
      if (editMode && onToggleEditMode) {
        onToggleEditMode(event.id);
      } else if (onClick) {
        onClick(event.id);
      }
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