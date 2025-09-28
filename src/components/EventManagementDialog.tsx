import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import { Settings, Users, Check, X, UserPlus } from "lucide-react";

interface Event {
  id: string;
  title: string;
  event_type: string;
  max_attendees?: number;
  created_by: string;
  start_time?: string;
  description?: string;
}

interface JoinRequest {
  id: string;
  requester_id: string;
  status: string;
  created_at: string;
  profile?: {
    display_name: string;
    username: string;
  };
}

interface EventManagementDialogProps {
  event: Event | null;
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onEventUpdated: () => void;
}

export const EventManagementDialog = ({ event, user, isOpen, onClose, onEventUpdated }: EventManagementDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    max_attendees: ''
  });

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        max_attendees: event.max_attendees ? event.max_attendees.toString() : ''
      });
      
      if (event.created_by === user?.id) {
        loadJoinRequests();
      }
    }
  }, [event, user]);

  const loadJoinRequests = async () => {
    if (!event) return;

    // Get join requests first, then merge with profiles
    const { data: requestsData, error: requestsError } = await supabase
      .from('event_join_requests')
      .select('id, requester_id, status, created_at')
      .eq('event_id', event.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsError || !requestsData) {
      console.error('Error loading join requests:', requestsError);
      return;
    }

    if (requestsData.length > 0) {
      const requesterIds = requestsData.map(req => req.requester_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .in('user_id', requesterIds);

      // Create a map of profiles
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const formattedRequests = requestsData.map(req => ({
        ...req,
        profile: profileMap.get(req.requester_id)
      }));
      
      setJoinRequests(formattedRequests);
    } else {
      setJoinRequests([]);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !user) return;

    setIsLoading(true);

    try {
      const updateData = {
        title: formData.title.trim(),
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null
      };

      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', event.id);

      if (error) {
        console.error('Error updating event:', error);
        toast({
          title: "Error",
          description: "Failed to update event",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Event Updated! ✅",
        description: "Event details have been saved",
      });

      onEventUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRequest = async (requestId: string, action: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('event_join_requests')
        .update({ status: action })
        .eq('id', requestId);

      if (error) {
        console.error('Error handling join request:', error);
        return;
      }

      // If accepted, add user to event attendees
      if (action === 'accepted') {
        const request = joinRequests.find(r => r.id === requestId);
        if (request) {
          await supabase
            .from('event_attendees')
            .insert({
              event_id: event!.id,
              user_id: request.requester_id,
              status: 'going'
            });
        }
      }

      toast({
        title: action === 'accepted' ? "Request Accepted! ✅" : "Request Rejected",
        description: `Join request has been ${action}`,
      });

      loadJoinRequests();
    } catch (error) {
      console.error('Error handling join request:', error);
      toast({
        title: "Error",
        description: "Failed to handle request",
        variant: "destructive"
      });
    }
  };

  if (!event) return null;

  const isOwner = event.created_by === user?.id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Event Management
          </DialogTitle>
        </DialogHeader>

        {isOwner ? (
          <div className="space-y-4">
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Event title"
                  required
                />
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

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </form>

            {joinRequests.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  <h4 className="font-medium">Pending Join Requests</h4>
                  <Badge variant="secondary">{joinRequests.length}</Badge>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {joinRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {request.profile?.display_name || request.profile?.username || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleJoinRequest(request.id, 'accepted')}
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleJoinRequest(request.id, 'rejected')}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Only the event creator can manage this event.
            </p>
          </div>
        )}

        <Button variant="outline" onClick={onClose} className="w-full">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
};