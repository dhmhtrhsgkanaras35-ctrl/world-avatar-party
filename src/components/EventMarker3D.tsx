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
  };
  attendeeCount?: number;
  onEventClick?: (eventId: string) => void;
}

export const createEventMarker3D = ({ 
  event, 
  attendeeCount = 0, 
  onEventClick 
}: EventMarker3DProps) => {
  const el = document.createElement('div');
  el.className = 'event-marker-3d-container';
  el.style.cssText = `
    position: relative;
    cursor: pointer;
    transition: transform 0.3s ease;
  `;

  // Create container for 3D stage or regular marker
  if (event.event_type === 'party') {
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

  // Add hover effects
  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.1) translateY(-5px)';
    el.style.zIndex = '1000';
  });
  
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1) translateY(0)';
    el.style.zIndex = '100';
  });

  // Add click handler
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(event.id);
    }
  });

  return el;
};