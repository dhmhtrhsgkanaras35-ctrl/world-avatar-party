import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import { EmojiAvatar } from "./EmojiAvatar";
import { UserPlus, Check, X, Users, Search } from "lucide-react";

interface FriendRequestManagerProps {
  user: User | null;
}

interface FriendRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
  requester_profile?: {
    display_name: string;
    avatar_url: string;
  };
  recipient_profile?: {
    display_name: string;
    avatar_url: string;
  };
}

export const FriendRequestManager = ({ user }: FriendRequestManagerProps) => {
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadFriendRequests();
    }
  }, [user]);

  // Filter friends based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFriends(friends);
    } else {
      const filtered = friends.filter(friend => {
        const friendProfile = friend.requester_id === user?.id 
          ? friend.recipient_profile 
          : friend.requester_profile;
        const displayName = friendProfile?.display_name?.toLowerCase() || '';
        return displayName.includes(searchQuery.toLowerCase());
      });
      setFilteredFriends(filtered);
    }
  }, [friends, searchQuery, user?.id]);

  const loadFriendRequests = async () => {
    if (!user) return;

    try {
      // Load all friendships involving this user with manual joins
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

      if (error) {
        console.error('Error loading friend requests:', error);
        return;
      }

      if (data) {
        // Get unique user IDs to load profiles
        const userIds = new Set<string>();
        data.forEach(req => {
          userIds.add(req.requester_id);
          userIds.add(req.recipient_id);
        });

        // Load profiles for all users
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', Array.from(userIds));

        if (profileError) {
          console.error('Error loading profiles:', profileError);
          return;
        }

        // Create profiles map
        const profilesMap: {[key: string]: any} = {};
        profiles?.forEach(profile => {
          profilesMap[profile.user_id] = profile;
        });

        // Add profile data to requests
        const requestsWithProfiles = data.map(request => ({
          ...request,
          requester_profile: profilesMap[request.requester_id],
          recipient_profile: profilesMap[request.recipient_id]
        }));

        // Separate into categories
        const pending = requestsWithProfiles.filter(req => req.status === 'pending' && req.recipient_id === user.id);
        const sent = requestsWithProfiles.filter(req => req.status === 'pending' && req.requester_id === user.id);
        const accepted = requestsWithProfiles.filter(req => req.status === 'accepted');

        setPendingRequests(pending);
        setSentRequests(sent);
        setFriends(accepted);
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const sendFriendRequest = async (recipientUserId: string) => {
    if (!user) return;

    try {
      // Check rate limit first
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .from('friend_request_limits')
        .select('request_count')
        .eq('user_id', user.id)
        .gte('window_start', oneHourAgo)
        .maybeSingle();

      if (rateLimitError && rateLimitError.code !== 'PGRST116') {
        console.error('Error checking rate limit:', rateLimitError);
        return;
      }

      if (rateLimitData && rateLimitData.request_count >= 5) {
        toast({
          title: "Rate Limited",
          description: "You can only send 5 friend requests per hour",
          variant: "destructive"
        });
        return;
      }

      // Send friend request
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          recipient_id: recipientUserId,
          status: 'pending'
        } as any); // Type assertion to handle the schema mismatch

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Already Requested",
            description: "You've already sent a friend request to this person",
            variant: "destructive"
          });
        } else {
          console.error('Error sending friend request:', error);
          toast({
            title: "Error",
            description: "Failed to send friend request",
            variant: "destructive"
          });
        }
        return;
      }

      // Update rate limit
      await supabase
        .from('friend_request_limits')
        .upsert({
          user_id: user.id,
          request_count: (rateLimitData?.request_count || 0) + 1,
          window_start: rateLimitData ? undefined : new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent!",
      });

      loadFriendRequests();
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const respondToFriendRequest = async (requestId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', requestId);

      if (error) {
        console.error('Error responding to friend request:', error);
        return;
      }

      toast({
        title: accept ? "Friend Request Accepted" : "Friend Request Rejected",
        description: accept 
          ? "You are now friends! You can see each other on the map."
          : "Friend request has been rejected",
      });

      loadFriendRequests();
    } catch (error) {
      console.error('Error responding to friend request:', error);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-2 px-2 min-w-0"
        >
          <Users className="h-5 w-5" />
          <span className="text-xs">Friends</span>
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs">
              {pendingRequests.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friends & Requests
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pending Friend Requests */}
          {pendingRequests.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Pending Requests
                  <Badge variant="secondary">{pendingRequests.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <EmojiAvatar 
                        emoji={(request.requester_profile as any)?.emoji || '🙂'}
                        color={(request.requester_profile as any)?.emoji_color || '#3B82F6'}
                        size="small"
                      />
                      <span className="text-sm font-medium">
                        {request.requester_profile?.display_name || 'Unknown User'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => respondToFriendRequest(request.id, true)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respondToFriendRequest(request.id, false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Current Friends */}
          {friends.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Friends
                  <Badge variant="secondary">{friends.length}</Badge>
                </CardTitle>
                {/* Friend Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-40 overflow-y-auto">
                {filteredFriends.length > 0 ? (
                  filteredFriends.map((friend) => {
                    const friendProfile = friend.requester_id === user.id 
                      ? friend.recipient_profile 
                      : friend.requester_profile;
                    
                    return (
                      <div key={friend.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        <EmojiAvatar 
                          emoji={(friendProfile as any)?.emoji || '🙂'}
                          color={(friendProfile as any)?.emoji_color || '#3B82F6'}
                          size="small"
                        />
                        <span className="text-sm font-medium">
                          {friendProfile?.display_name || 'Unknown User'}
                        </span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          Friend
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No friends found matching "{searchQuery}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sent Requests */}
          {sentRequests.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Sent Requests
                  <Badge variant="secondary">{sentRequests.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <EmojiAvatar 
                        emoji={(request.recipient_profile as any)?.emoji || '🙂'}
                        color={(request.recipient_profile as any)?.emoji_color || '#3B82F6'}
                        size="small"
                      />
                      <span className="text-sm font-medium">
                        {request.recipient_profile?.display_name || 'Unknown User'}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Pending
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {pendingRequests.length === 0 && friends.length === 0 && sentRequests.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No friends or requests yet</p>
              <p className="text-xs">Find people nearby on the map to send friend requests!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};