import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import { AvatarDisplay } from "./AvatarDisplay";
import { MessageCircle, Send, Users } from "lucide-react";

interface MessagesDialogProps {
  user: User | null;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  is_read: boolean;
  sender_profile?: {
    display_name: string;
    avatar_url: string;
  };
}

interface Friend {
  user_id: string;
  display_name: string;
  avatar_url: string;
}

export const MessagesDialog = ({ user }: MessagesDialogProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user && isOpen) {
      loadFriends();
      loadUnreadCount();
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (selectedFriend && user) {
      loadMessages(selectedFriend.user_id);
    }
  }, [selectedFriend, user]);

  const loadFriends = async () => {
    if (!user) return;

    try {
      // Get accepted friendships
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('requester_id, recipient_id')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error loading friends:', error);
        return;
      }

      if (friendships && friendships.length > 0) {
        // Get friend IDs
        const friendIds = friendships.map(f => 
          f.requester_id === user.id ? f.recipient_id : f.requester_id
        );

        // Load friend profiles
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', friendIds);

        if (profileError) {
          console.error('Error loading friend profiles:', profileError);
          return;
        }

        setFriends(profiles?.map(p => ({
          user_id: p.user_id,
          display_name: p.display_name || 'Unknown User',
          avatar_url: p.avatar_url || ''
        })) || []);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadUnreadCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (!error) {
        setUnreadCount(count || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadMessages = async (friendId: string) => {
    if (!user) return;

    try {
      // Load messages
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      // Load sender profiles for unique sender IDs
      const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', senderIds);

      if (profileError) {
        console.error('Error loading sender profiles:', profileError);
        return;
      }

      // Create profiles map
      const profilesMap: {[key: string]: any} = {};
      profiles?.forEach(profile => {
        profilesMap[profile.user_id] = profile;
      });

      // Add profile data to messages
      const messagesWithProfiles = messagesData?.map(message => ({
        ...message,
        sender_profile: profilesMap[message.sender_id]
      })) || [];

      setMessages(messagesWithProfiles);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('sender_id', friendId);

      loadUnreadCount();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedFriend || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: selectedFriend.user_id,
          content: newMessage.trim(),
          message_type: 'text'
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

      setNewMessage("");
      loadMessages(selectedFriend.user_id);
      
      toast({
        title: "Message Sent",
        description: `Message sent to ${selectedFriend.display_name}`,
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-2 px-2 min-w-0 relative"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-xs">Messages</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {selectedFriend ? selectedFriend.display_name : 'Messages'}
          </DialogTitle>
        </DialogHeader>

        {!selectedFriend ? (
          /* Friends List */
          <div className="flex-1 space-y-2">
            {friends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No friends to message</p>
                <p className="text-xs">Add friends to start chatting!</p>
              </div>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.user_id}
                  onClick={() => setSelectedFriend(friend)}
                  className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                >
                  <AvatarDisplay 
                    avatarUrl={friend.avatar_url}
                    size="small"
                    showStatus={true}
                    status="online"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{friend.display_name}</p>
                    <p className="text-xs text-muted-foreground">Tap to chat</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Chat View */
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 pb-2 border-b mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedFriend(null)}
              >
                ← Back
              </Button>
              <AvatarDisplay 
                avatarUrl={selectedFriend.avatar_url}
                size="small"
              />
              <span className="font-medium">{selectedFriend.display_name}</span>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          message.sender_id === user.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs opacity-70 mt-1 ${
                          message.sender_id === user.id ? 'text-right' : 'text-left'
                        }`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="flex gap-2 pt-2 border-t">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} size="sm" disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};