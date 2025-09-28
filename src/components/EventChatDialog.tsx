import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import { MessageCircle, Send, Users } from "lucide-react";

interface Event {
  id: string;
  title: string;
  event_type: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  profile?: {
    display_name: string;
    username: string;
  };
}

interface EventChatDialogProps {
  event: Event | null;
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EventChatDialog = ({ event, user, isOpen, onClose }: EventChatDialogProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isAttendee, setIsAttendee] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (event && user && isOpen) {
      checkAttendeeStatus();
      loadMessages();
      
      // Subscribe to real-time messages
      const channel = supabase
        .channel('event-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'event_messages',
            filter: `event_id=eq.${event.id}`
          },
          (payload) => {
            loadMessages(); // Reload messages when new ones arrive
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [event, user, isOpen]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkAttendeeStatus = async () => {
    if (!event || !user) return;

    const { data } = await supabase
      .from('event_attendees')
      .select('status')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .eq('status', 'going')
      .single();

    setIsAttendee(!!data);
  };

  const loadMessages = async () => {
    if (!event) return;

    setIsLoading(true);

    try {
      // Get profiles first, then merge with messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('event_messages')
        .select('id, content, sender_id, created_at')
        .eq('event_id', event.id)
        .order('created_at', { ascending: true });

      if (messagesError || !messagesData) {
        console.error('Error loading messages:', messagesError);
        return;
      }

      // Get unique sender IDs
      const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];
      
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, username')
          .in('user_id', senderIds);

        // Create a map of profiles
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const formattedMessages = messagesData.map(msg => ({
          ...msg,
          profile: profileMap.get(msg.sender_id)
        }));
        
        setMessages(formattedMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !event || !user || !isAttendee) return;

    setIsSending(true);

    try {
      const { error } = await supabase
        .from('event_messages')
        .insert({
          event_id: event.id,
          sender_id: user.id,
          content: newMessage.trim()
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
        return;
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!event) return null;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getDisplayName = (message: Message) => {
    return message.profile?.display_name || message.profile?.username || 'Anonymous';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[70vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {event.title} - Chat
          </DialogTitle>
        </DialogHeader>

        {!isAttendee ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium">Join the event to chat</p>
              <p className="text-sm text-muted-foreground">
                Only event attendees can access the chat
              </p>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-2" ref={scrollAreaRef}>
              {isLoading ? (
                <div className="text-center text-muted-foreground">
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-2 ${
                          message.sender_id === user?.id
                            ? 'bg-primary text-primary-foreground ml-4'
                            : 'bg-muted mr-4'
                        }`}
                      >
                        {message.sender_id !== user?.id && (
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {getDisplayName(message)}
                          </p>
                        )}
                        <p className="text-sm break-words">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <form onSubmit={sendMessage} className="flex gap-2 p-2 border-t">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={isSending}
                className="flex-1"
              />
              <Button 
                type="submit" 
                size="sm" 
                disabled={isSending || !newMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};