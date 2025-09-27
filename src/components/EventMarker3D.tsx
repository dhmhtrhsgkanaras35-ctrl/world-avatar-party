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
    cursor: pointer;
    transition: transform 0.3s ease;
    opacity: ${event.isTemporary ? '0.7' : '1'};
    filter: ${event.isTemporary ? 'brightness(1.3) saturate(1.2)' : 'none'};
    animation: ${event.isTemporary ? 'tempEventPulse 2s infinite' : 'none'};
    z-index: ${event.isTemporary ? '1000' : '100'};
  `;

  // Add pulsing animation for temporary events
  if (event.isTemporary) {
    const style = document.createElement('style');
    if (!document.getElementById('temp-event-styles')) {
      style.id = 'temp-event-styles';
      style.textContent = `
        @keyframes tempEventPulse {
          0%, 100% { 
            opacity: 0.5; 
            transform: scale(1);
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
          }
          50% { 
            opacity: 0.9; 
            transform: scale(1.05);
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
          }
        }
        @keyframes tempEventBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `;
      document.head.appendChild(style);
    }
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
        bottom: -45px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
        animation: tempEventBounce 2s infinite;
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        z-index: 1001;
      `;
      placementHint.innerHTML = '👆 <strong>CLICK TO PLACE!</strong>';
      el.appendChild(placementHint);
    }
    
    // Add cancel button for temporary events
    if (event.isTemporary) {
      const cancelButton = document.createElement('div');
      cancelButton.style.cssText = `
        position: absolute;
        top: -10px;
        right: -10px;
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        z-index: 1002;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      `;
      cancelButton.innerHTML = '×';
      cancelButton.title = 'Cancel Event Creation';
      
      cancelButton.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Cancel button clicked for temp event:', event.id);
        if (onEventDelete) {
          onEventDelete(event.id);
        }
      });
      
      el.appendChild(cancelButton);
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

  // Add delete button for permanent event owners
  if (currentUserId === event.created_by && !event.isTemporary) {
    const deleteButton = document.createElement('div');
    deleteButton.style.cssText = `
      position: absolute;
      top: -8px;
      left: -8px;
      background: #ef4444;
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
      console.log('Delete button clicked for permanent event:', event.id);
      if (onEventDelete && confirm('Are you sure you want to delete this event?')) {
        onEventDelete(event.id);
      }
    });
    
    el.appendChild(deleteButton);
    
    // Show delete button on hover for permanent events
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

  // Add click handler for temporary events (to place them)
  if (event.isTemporary) {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      console.log('Temporary event clicked for placement:', event.id);
      
      if (onEventPlace) {
        onEventPlace(event.id, event.latitude, event.longitude);
      }
    });
  } else {
    // Regular click handler for permanent events
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onEventClick) {
        onEventClick(event.id);
      }
    });
  }

  return el;
};