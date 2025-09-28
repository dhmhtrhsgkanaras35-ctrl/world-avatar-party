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
    isEditMode?: boolean;
  };
  attendeeCount?: number;
  onEventClick?: (eventId: string) => void;
  onEventMove?: (eventId: string, lat: number, lng: number) => void;
  onEventDelete?: (eventId: string) => void;
  onEventPlace?: (eventId: string, lat: number, lng: number) => void;
  onToggleEditMode?: (eventId: string) => void;
  currentUserId?: string;
}

export const createEventMarker3D = ({ 
  event, 
  attendeeCount = 0, 
  onEventClick,
  onEventMove,
  onEventDelete,
  onEventPlace,
  onToggleEditMode,
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

  // Add pulsing animation for temporary events and delete buttons
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
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 6px 20px rgba(239, 68, 68, 0.6);
          }
          50% { 
            transform: scale(1.05);
            box-shadow: 0 8px 24px rgba(239, 68, 68, 0.8);
          }
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
    
    // Add cancel button for temporary events - LARGE, STABLE OVERLAY
    if (event.isTemporary) {
      // Create a large overlay area for easier clicking
      const cancelOverlay = document.createElement('div');
      cancelOverlay.style.cssText = `
        position: absolute;
        top: -20px;
        right: -20px;
        width: 60px;
        height: 60px;
        background: rgba(239, 68, 68, 0.1);
        border-radius: 50%;
        cursor: pointer;
        z-index: 1003;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
      `;
      
      const cancelButton = document.createElement('div');
      cancelButton.style.cssText = `
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
        border: 4px solid white;
        box-shadow: 0 6px 20px rgba(239, 68, 68, 0.8);
        animation: pulse 2s infinite;
        pointer-events: auto;
      `;
      cancelButton.innerHTML = '×';
      cancelButton.title = 'Cancel Event Creation';
      
      cancelOverlay.appendChild(cancelButton);
      
      // Add multiple event listeners to ensure we catch the click
      const handleCancel = (e) => {
        e.stopPropagation();
        e.preventDefault();
        e.stopImmediatePropagation();
        console.log('Cancel button clicked for temp event:', event.id);
        if (onEventDelete) {
          onEventDelete(event.id);
        }
      };
      
      // Add listeners to both overlay and button
      cancelOverlay.addEventListener('click', handleCancel);
      cancelButton.addEventListener('click', handleCancel);
      
      // Prevent all drag/move behavior
      [cancelOverlay, cancelButton].forEach(element => {
        element.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          e.preventDefault();
        });
        element.addEventListener('touchstart', (e) => {
          e.stopPropagation();
          e.preventDefault();
        });
        element.addEventListener('dragstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      });
      
      el.appendChild(cancelOverlay);
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

  // Add delete and place event buttons for permanent event owners - ISOLATED FROM DRAG AREA
  if (currentUserId === event.created_by && !event.isTemporary) {
    // Container for both buttons - positioned OUTSIDE the draggable area
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      position: absolute;
      top: -30px;
      left: -80px;
      display: flex;
      gap: 10px;
      z-index: 1003;
      pointer-events: none;
    `;

    // Place Event Button
    const placeOverlay = document.createElement('div');
    placeOverlay.style.cssText = `
      width: 50px;
      height: 50px;
      background: rgba(34, 197, 94, 0.9);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      transition: all 0.2s ease;
      border: 3px solid white;
      box-shadow: 0 4px 16px rgba(34, 197, 94, 0.6);
    `;
    
    const placeButton = document.createElement('div');
    placeButton.style.cssText = `
      color: white;
      font-size: 18px;
      font-weight: bold;
      pointer-events: none;
      user-select: none;
    `;
    placeButton.innerHTML = event.isEditMode ? '📍' : '✋';
    placeButton.title = event.isEditMode ? 'Lock Event Position' : 'Enable Drag Mode';
    
    placeOverlay.appendChild(placeButton);

    // Delete Button
    const deleteOverlay = document.createElement('div');
    deleteOverlay.style.cssText = `
      width: 50px;
      height: 50px;
      background: rgba(239, 68, 68, 0.9);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      transition: all 0.2s ease;
      border: 3px solid white;
      box-shadow: 0 4px 16px rgba(239, 68, 68, 0.6);
    `;
    
    const deleteButton = document.createElement('div');
    deleteButton.style.cssText = `
      color: white;
      font-size: 24px;
      font-weight: bold;
      pointer-events: none;
      user-select: none;
    `;
    deleteButton.innerHTML = '×';
    deleteButton.title = 'Delete Event';
    
    deleteOverlay.appendChild(deleteButton);

    // Add both buttons to container
    buttonsContainer.appendChild(placeOverlay);
    buttonsContainer.appendChild(deleteOverlay);

    // Place button event handlers - COMPLETELY ISOLATED
    const handlePlaceClick = (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      e.stopPropagation();
      console.log('Place/Edit button clicked for event:', event.id);
      if (onToggleEditMode) {
        onToggleEditMode(event.id);
      }
    };

    // Delete button event handlers - COMPLETELY ISOLATED
    const handleDelete = (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      e.stopPropagation();
      console.log('Delete button clicked for permanent event:', event.id);
      if (onEventDelete && confirm('Are you sure you want to delete this event?')) {
        onEventDelete(event.id);
      }
    };
    
    // CRITICAL: Prevent ALL mouse events from bubbling up to the marker
    const preventAllEvents = (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      e.stopPropagation();
    };
    
    // Add comprehensive event prevention to both buttons
    [placeOverlay, deleteOverlay].forEach(element => {
      // Click handlers
      element.addEventListener('click', element === placeOverlay ? handlePlaceClick : handleDelete);
      
      // Prevent ALL possible drag-related events
      ['mousedown', 'mouseup', 'mousemove', 'touchstart', 'touchend', 'touchmove', 
       'dragstart', 'drag', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop',
       'pointerdown', 'pointermove', 'pointerup'].forEach(eventType => {
        element.addEventListener(eventType, preventAllEvents, true);
      });
    });
    
    // Enhanced hover effects
    placeOverlay.addEventListener('mouseenter', () => {
      placeOverlay.style.transform = 'scale(1.1)';
      placeOverlay.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.8)';
    });
    
    placeOverlay.addEventListener('mouseleave', () => {
      placeOverlay.style.transform = 'scale(1)';
      placeOverlay.style.boxShadow = '0 4px 16px rgba(34, 197, 94, 0.6)';
    });

    deleteOverlay.addEventListener('mouseenter', () => {
      deleteOverlay.style.transform = 'scale(1.1)';
      deleteOverlay.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.8)';
    });
    
    deleteOverlay.addEventListener('mouseleave', () => {
      deleteOverlay.style.transform = 'scale(1)';
      deleteOverlay.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.6)';
    });
    
    el.appendChild(buttonsContainer);
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