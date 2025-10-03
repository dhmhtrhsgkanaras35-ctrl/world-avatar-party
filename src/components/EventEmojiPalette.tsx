import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

interface EventEmojiPaletteProps {
  user: User | null;
  userLocation?: { lat: number; lng: number } | null;
  userZone?: string | null;
  onClose?: () => void;
}

// Event type emojis mapping
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

export const EventEmojiPalette = ({ user, userLocation, userZone, onClose }: EventEmojiPaletteProps) => {
  const { toast } = useToast();
  const [dragging, setDragging] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, eventType: string) => {
    if (!user || !userLocation) {
      e.preventDefault();
      toast({
        title: "Location Required",
        description: "Please enable location sharing to create events",
        variant: "destructive"
      });
      return;
    }

    setDragging(eventType);
    e.dataTransfer.setData('text/plain', eventType);
    e.dataTransfer.effectAllowed = 'copy';

    // Create a custom drag image with the emoji
    const dragImage = document.createElement('div');
    dragImage.innerHTML = EVENT_EMOJIS[eventType as keyof typeof EVENT_EMOJIS];
    dragImage.style.fontSize = '32px';
    dragImage.style.padding = '6px';
    dragImage.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    dragImage.style.borderRadius = '8px';
    dragImage.style.border = '2px solid #3b82f6';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 20, 20);
    
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 100);

    toast({
      title: "🎯 Drag & Drop",
      description: `Drag the ${EVENT_NAMES[eventType as keyof typeof EVENT_NAMES]} emoji to the map to create an event!`,
      duration: 3000,
    });
  };

  const handleDragEnd = () => {
    setDragging(null);
  };

  return (
    <Card style={{
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '2px solid hsl(var(--border))',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      position: 'relative',
      maxWidth: '200px'
    }}>
      <CardContent style={{ padding: '12px' }}>
        {/* Close button */}
        {onClose && (
          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '28px',
              height: '28px',
              backgroundColor: '#6b7280',
              color: 'white',
              borderRadius: '50%',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s',
              zIndex: 10,
              cursor: 'pointer',
              border: '2px solid white'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#4b5563';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#6b7280';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Close Event Palette"
          >
            ✕
          </button>
        )}
        
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'hsl(var(--muted-foreground))',
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          🎯 Drag to map
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px'
        }}>
          {Object.entries(EVENT_EMOJIS).map(([eventType, emoji]) => (
            <Button
              key={eventType}
              variant="ghost"
              size="sm"
              style={{
                height: '48px',
                width: '48px',
                padding: 0,
                fontSize: '24px',
                cursor: dragging === eventType ? 'grabbing' : 'grab',
                transition: 'all 0.2s',
                transform: dragging === eventType ? 'scale(1.1)' : 'scale(1)',
                backgroundColor: dragging === eventType ? 'hsl(var(--primary) / 0.2)' : 'transparent'
              }}
              className="hover:scale-105"
              draggable={!!user && !!userLocation}
              onDragStart={(e) => handleDragStart(e, eventType)}
              onDragEnd={handleDragEnd}
              title={EVENT_NAMES[eventType as keyof typeof EVENT_NAMES]}
            >
              {emoji}
            </Button>
          ))}
        </div>
        {(!user || !userLocation) && (
          <div style={{
            fontSize: '12px',
            color: 'hsl(var(--muted-foreground))',
            marginTop: '8px',
            textAlign: 'center'
          }}>
            Enable location to create events
          </div>
        )}
      </CardContent>
    </Card>
  );
};