import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import { Plus, Calendar, MapPin } from "lucide-react";

interface CreateEventDialogProps {
  user: User | null;
  userLocation?: { lat: number; lng: number } | null;
  userZone?: string | null;
}

export const CreateEventDialog = ({ user, userLocation, userZone }: CreateEventDialogProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'house-party',
    start_time: '',
    end_time: '',
    max_attendees: '',
    is_public: true
  });

  // Set default start time when dialog opens
  useEffect(() => {
    if (isOpen && !formData.start_time) {
      const defaultStartTime = getCurrentDateTime();
      setFormData(prev => ({
        ...prev,
        start_time: defaultStartTime
      }));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userLocation) {
      toast({
        title: "Location Required",
        description: "Please enable location sharing to create events",
        variant: "destructive"
      });
      return;
    }

    // Validate required fields
    if (!formData.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter an event title",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const eventData = {
        title: formData.title.trim(),
        description: formData.description || null,
        event_type: formData.event_type,
        start_time: formData.start_time ? new Date(formData.start_time).toISOString() : null,
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        is_public: formData.is_public,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        created_by: user.id,
        address: `Zone: ${userZone || 'Unknown'}`,
      };

      const { data: newEvent, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        toast({
          title: "Error",
          description: "Failed to create event",
          variant: "destructive"
        });
        return;
      }

      if (newEvent) {
        await supabase
          .from('event_attendees')
          .insert({
            event_id: newEvent.id,
            user_id: user.id,
            status: 'going'
          });
      }

      toast({
        title: "Event Created! 🎉",
        description: `${formData.title} has been created successfully`,
      });

      // Reset form and close dialog
      setFormData({
        title: '',
        description: '',
        event_type: 'house-party',
        start_time: '',
        end_time: '',
        max_attendees: '',
        is_public: true
      });
      setIsOpen(false);

      // Reload the page to show the new event
      window.location.reload();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    // Add 1 hour to current time as default
    now.setHours(now.getHours() + 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-2 px-2 min-w-0"
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs">Create</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Event
          </DialogTitle>
          {userZone && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Zone: {userZone}
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="House Party Tonight!"
              required
            />
          </div>

          <div>
            <Label htmlFor="event_type">Event Type</Label>
            <Select 
              value={formData.event_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="house-party">🏠🔊 House Party</SelectItem>
                <SelectItem value="running">🏃‍♂️ Running/Fitness</SelectItem>
                <SelectItem value="concert">🎵🎤 Concert/Music</SelectItem>
                <SelectItem value="meetup">🤝🗣️ Meetup/Social</SelectItem>
                <SelectItem value="sports">⚽🏃‍♀️ Sports</SelectItem>
                <SelectItem value="food">🍕🍻 Food & Drinks</SelectItem>
                <SelectItem value="party">🎉🎪 General Party</SelectItem>
                <SelectItem value="gaming">🎮🕹️ Gaming</SelectItem>
                <SelectItem value="study">📚✏️ Study Group</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tell people what to expect..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                min={getCurrentDateTime()}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="end_time">End Time (optional)</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                min={formData.start_time || getCurrentDateTime()}
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="max_attendees">Max Attendees (optional)</Label>
            <Input
              id="max_attendees"
              type="number"
              value={formData.max_attendees}
              onChange={(e) => setFormData(prev => ({ ...prev, max_attendees: e.target.value }))}
              placeholder="Leave empty for unlimited"
              min="1"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="is_public">Public Event</Label>
            <input
              id="is_public"
              type="checkbox"
              checked={formData.is_public}
              onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
              className="rounded"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Creating..." : "Create Event"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};