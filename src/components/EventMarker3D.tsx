import { createRoot } from 'react-dom/client';
import { StageParty3D } from './StageParty3D';
import { EventMarker } from './EventMarker';

interface EventMarker3DProps {
  event: {
    id: string;
    title: string;
    event_type: string;
    latitude: number;
    longitude: number;
    start_time?: string;
    max_attendees?: number;
    created_by: string;
    isDragging?: boolean;
    isTemporary?: boolean;
  };
  attendeeCount?: number;
  onEventClick?: (eventId: string) => void;
  onEventMove?: (eventId: string, lat: number, lng: number) => void;
  onEventDelete?: (eventId: string) => void;
  onEventPlace?: (eventId: string, lat: number, lng: number) => void;
  currentUserId?: string;
}

export const createEventMarker3D = ({ 
  event, 
  attendeeCount = 0, 
  onEventClick,
  onEventMove,
  onEventDelete,
  onEventPlace,
  currentUserId
}: EventMarker3DProps) => {
  const el = document.createElement('div');
  el.className = 'event-marker-3d-container';
  el.style.cssText = `
    position: relative;
    cursor: ${currentUserId === event.created_by || event.isTemporary ? 'grab' : 'pointer'};
    transition: transform 0.3s ease;
    opacity: ${event.isDragging || event.isTemporary ? '0.6' : '1'};
    filter: ${event.isDragging || event.isTemporary ? 'brightness(1.2) saturate(1.5)' : 'none'};
    animation: ${event.isTemporary ? 'pulse 1.5s infinite' : 'none'};
  `;

  // Make it draggable if user owns the event or it's temporary
  if (currentUserId === event.created_by || event.isTemporary) {
    el.draggable = true;
  }

  // Add pulsing animation for temporary events
  if (event.isTemporary) {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.05); }
      }
    `;
    document.head.appendChild(style);
  }

  // Create container for 3D stage or regular marker
  if (event.event_type === 'party') {
    console.log('Creating 3D stage for party event:', event.title, 'isTemporary:', event.isTemporary);
    // Container for 3D stage
    const stageContainer = document.createElement('div');
    stageContainer.style.cssText = `
      width: 120px;
      height: 80px;
      position: relative;
      transform-origin: center bottom;
    `;
    
    // Mount the 3D stage component
    const root = createRoot(stageContainer);
    root.render(
      <StageParty3D 
        width={120} 
        height={80} 
        animate={true} 
        showControls={false}
        scale={0.8}
      />
    );
    
    el.appendChild(stageContainer);
    console.log('3D stage added to DOM for event:', event.title);
    
    // Add event info overlay
    const infoOverlay = document.createElement('div');
    infoOverlay.style.cssText = `
      position: absolute;
      bottom: -5px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    infoOverlay.textContent = `🎉 ${event.title}`;
    el.appendChild(infoOverlay);

    // Add placement hint for temporary events
    if (event.isTemporary) {
      const placementHint = document.createElement('div');
      placementHint.style.cssText = `
        position: absolute;
        bottom: -35px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(59, 130, 246, 0.95);
        color: white;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        animation: bounce 2s infinite;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      placementHint.textContent = '👆 Click to place here!';
      el.appendChild(placementHint);

      // Add bounce animation
      const bounceStyle = document.createElement('style');
      bounceStyle.textContent = `
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-5px); }
        }
      `;
      document.head.appendChild(bounceStyle);
    }
    
    // Add attendee count badge if > 0
    if (attendeeCount > 0) {
      const attendeeBadge = document.createElement('div');
      attendeeBadge.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ff4444;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        font-weight: bold;
        border: 2px solid white;
      `;
      attendeeBadge.textContent = attendeeCount.toString();
      el.appendChild(attendeeBadge);
    }
    
  } else {
    // Use regular event marker for non-party events
    const markerContainer = document.createElement('div');
    const root = createRoot(markerContainer);
    
    const eventType = event.event_type === 'concert' ? 'concert' : 'house-party';
    root.render(
      <EventMarker
        type={eventType}
        title={event.title}
        attendees={attendeeCount}
        animated={true}
      />
    );
    
    el.appendChild(markerContainer);
  }

  // Add delete button for event owner
  if (currentUserId === event.created_by) {
    const deleteButton = document.createElement('div');
    deleteButton.style.cssText = `
      position: absolute;
      top: -8px;
      left: -8px;
      background: #ff4444;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      z-index: 1001;
      border: 2px solid white;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;
    deleteButton.innerHTML = '×';
    deleteButton.title = 'Delete Event';
    
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onEventDelete && confirm('Are you sure you want to delete this event?')) {
        onEventDelete(event.id);
      }
    });
    
    el.appendChild(deleteButton);
    
    // Show delete button on hover
    el.addEventListener('mouseenter', () => {
      deleteButton.style.opacity = '1';
    });
    
    el.addEventListener('mouseleave', () => {
      deleteButton.style.opacity = '0';
    });
  }

  // Add hover effects
  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.1) translateY(-5px)';
    el.style.zIndex = '1000';
  });
  
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1) translateY(0)';
    el.style.zIndex = '100';
  });

  // Add drag and drop handlers for event owner or temporary events
  if ((currentUserId === event.created_by || event.isTemporary) && (onEventMove || onEventPlace)) {
    let isDragging = false;
    
    el.addEventListener('dragstart', (e) => {
      isDragging = true;
      el.style.cursor = 'grabbing';
      el.style.opacity = '0.4';
      el.style.transform = 'scale(1.1)';
      
      // Add visual feedback
      document.body.style.cursor = 'grabbing';
    });
    
    el.addEventListener('dragend', (e) => {
      isDragging = false;
      el.style.cursor = event.isTemporary ? 'grab' : (currentUserId === event.created_by ? 'grab' : 'pointer');
      el.style.opacity = event.isTemporary ? '0.6' : '1';
      el.style.transform = 'scale(1)';
      
      document.body.style.cursor = 'default';
      
      // Get the drop coordinates from the map
      const mapContainer = document.querySelector('.mapboxgl-canvas-container');
      if (mapContainer) {
        const rect = mapContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Dispatch custom event for coordinate conversion
        el.dispatchEvent(new CustomEvent('eventDrop', {
          detail: { 
            eventId: event.id, 
            x, 
            y, 
            isTemporary: event.isTemporary 
          }
        }));
      }
    });
  }

  // Add click handler
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(event.id);
    }
  });

  return el;
};