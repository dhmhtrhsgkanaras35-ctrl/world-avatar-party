import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

interface EventEmojiPaletteProps {
  user: User | null;
  userLocation?: { lat: number; lng: number } | null;
  userZone?: string | null;
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

export const EventEmojiPalette = ({ user, userLocation, userZone }: EventEmojiPaletteProps) => {
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
    dragImage.style.fontSize = '48px';
    dragImage.style.padding = '8px';
    dragImage.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    dragImage.style.borderRadius = '12px';
    dragImage.style.border = '2px solid #3b82f6';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 30, 30);
    
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
    <Card className="fixed bottom-20 left-4 z-50 bg-background/95 backdrop-blur-sm border shadow-lg">
      <CardContent className="p-3">
        <div className="text-xs font-medium text-muted-foreground mb-2 text-center">
          🎯 Drag emojis to map
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(EVENT_EMOJIS).map(([eventType, emoji]) => (
            <Button
              key={eventType}
              variant="ghost"
              size="sm"
              className={`h-12 w-12 p-0 text-2xl cursor-grab active:cursor-grabbing transition-all ${
                dragging === eventType ? 'scale-110 bg-primary/20' : 'hover:scale-105'
              }`}
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
          <div className="text-xs text-muted-foreground mt-2 text-center">
            Enable location to create events
          </div>
        )}
      </CardContent>
    </Card>
  );
};