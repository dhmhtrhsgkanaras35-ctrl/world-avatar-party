import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import { Users, Clock } from "lucide-react";

interface Event {
  id: string;
  title: string;
  event_type: string;
  max_attendees?: number;
  created_by: string;
  start_time?: string;
  description?: string;
}

interface EventJoinDialogProps {
  event: Event | null;
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onJoinRequested: () => void;
}

export const EventJoinDialog = ({ event, user, isOpen, onClose, onJoinRequested }: EventJoinDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinRequest = async () => {
    if (!user || !event) return;

    setIsLoading(true);

    try {
      // Check if user already has a pending or accepted request
      const { data: existingRequest } = await supabase
        .from('event_join_requests')
        .select('status')
        .eq('event_id', event.id)
        .eq('requester_id', user.id)
        .single();

      if (existingRequest) {
        toast({
          title: "Already Requested",
          description: `You already have a ${existingRequest.status} request for this event`,
          variant: "destructive"
        });
        onClose();
        return;
      }

      // Create join request
      const { error } = await supabase
        .from('event_join_requests')
        .insert({
          event_id: event.id,
          requester_id: user.id,
          status: 'pending'
        });

      if (error) {
        console.error('Error creating join request:', error);
        toast({
          title: "Error",
          description: "Failed to send join request",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Join Request Sent! 📩",
        description: `Your request to join "${event.title}" has been sent to the organizer`,
      });

      onJoinRequested();
      onClose();
    } catch (error) {
      console.error('Error sending join request:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!event) return null;

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'No time set';
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Join Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg">{event.title}</h3>
            <p className="text-muted-foreground">
              {event.event_type.replace('-', ' ').toUpperCase()} Event
            </p>
          </div>

          {event.description && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm">{event.description}</p>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Starts: {formatDateTime(event.start_time)}</span>
            </div>
            
            {event.max_attendees && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Max attendees: {event.max_attendees}</span>
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
            <p className="text-sm text-amber-700">
              Your join request will be sent to the event organizer for approval.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleJoinRequest} disabled={isLoading} className="flex-1">
              {isLoading ? "Sending..." : "Send Join Request"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};