import * as mapboxgl from 'mapbox-gl';

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
  map: any;
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
  
  // Create the main marker with inline buttons for creators - using inline styles for consistency
  markerElement.innerHTML = `
    <div style="position: relative; cursor: pointer;" class="group">
      <!-- Event marker -->
      <div 
        style="
          ${event.isTemporary ? 'animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;' : ''}
          ${editMode ? 'animation: bounce 1s infinite;' : ''}
          background-color: white;
          border-radius: 50%;
          padding: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          border: 3px solid ${event.isTemporary ? '#60a5fa' : editMode ? '#f87171' : '#e5e7eb'};
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          min-width: 56px;
          min-height: 56px;
          position: relative;
        " 
        data-event-main="true"
        onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 20px 25px -5px rgba(0, 0, 0, 0.1)';"
        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 10px 15px -3px rgba(0, 0, 0, 0.1)';"
      >
        ${emoji}
      </div>
      
      <!-- Action buttons for creators -->
      ${isCreator && !event.isTemporary ? `
        <button 
          data-action="manage"
          title="Manage Event"
          style="
            position: absolute;
            top: -6px;
            left: -6px;
            width: 26px;
            height: 26px;
            background-color: #3b82f6;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.15s;
            border: 2px solid white;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 10;
            pointer-events: auto;
            cursor: pointer;
          "
          onmouseover="this.style.backgroundColor='#2563eb'; this.style.transform='scale(1.1)'; this.style.boxShadow='0 20px 25px -5px rgba(0, 0, 0, 0.1)';"
          onmouseout="this.style.backgroundColor='#3b82f6'; this.style.transform='scale(1)'; this.style.boxShadow='0 10px 15px -3px rgba(0, 0, 0, 0.1)';"
        >⋯</button>
        
        <button 
          data-action="close"
          title="Close Event"
          style="
            position: absolute;
            top: -6px;
            right: -6px;
            width: 26px;
            height: 26px;
            background-color: #ef4444;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.15s;
            border: 2px solid white;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 10;
            pointer-events: auto;
            cursor: pointer;
          "
          onmouseover="this.style.backgroundColor='#dc2626'; this.style.transform='scale(1.1)'; this.style.boxShadow='0 20px 25px -5px rgba(0, 0, 0, 0.1)';"
          onmouseout="this.style.backgroundColor='#ef4444'; this.style.transform='scale(1)'; this.style.boxShadow='0 10px 15px -3px rgba(0, 0, 0, 0.1)';"
        >✕</button>
      ` : ''}
      
      <!-- Tooltip -->
      <div 
        style="
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 12px;
          background-color: rgba(0, 0, 0, 0.9);
          color: white;
          font-size: 13px;
          border-radius: 8px;
          padding: 8px 12px;
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
          white-space: nowrap;
          z-index: 50;
          backdrop-filter: blur(8px);
        "
        class="tooltip-hover"
      >
        <div style="font-weight: 500; margin-bottom: 2px;">${event.title}</div>
        ${event.isTemporary ? '<div style="color: #93c5fd;">Click to place</div>' : ''}
        ${editMode ? '<div style="color: #fca5a5;">Click to delete</div>' : ''}
        ${isCreator && !event.isTemporary ? '<div style="color: #fde047;">Manage or close event</div>' : ''}
      </div>

      <!-- Pulse effect for temporary events -->
      ${event.isTemporary ? `
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background-color: #60a5fa;
          opacity: 0.25;
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
          pointer-events: none;
        "></div>
      ` : ''}
    </div>
  `;

  // Add hover handler for tooltip
  const tooltipEl = markerElement.querySelector('.tooltip-hover') as HTMLElement;
  if (tooltipEl) {
    markerElement.addEventListener('mouseenter', () => {
      tooltipEl.style.opacity = '1';
    });
    markerElement.addEventListener('mouseleave', () => {
      tooltipEl.style.opacity = '0';
    });
  }

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
  const marker = new (mapboxgl as any).Marker({
    element: markerElement,
    anchor: 'bottom'
  })
  .setLngLat([event.longitude, event.latitude])
  .addTo(map);

  return marker;
};