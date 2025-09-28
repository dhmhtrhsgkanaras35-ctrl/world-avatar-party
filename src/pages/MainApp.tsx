import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RealMapComponent } from "@/components/RealMapComponent";
import { FriendRequestManager } from "@/components/FriendRequestManager";
import { LocationToggle } from "@/components/LocationToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Users, MessageCircle, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { MessagesDialog } from "@/components/MessagesDialog";
import { useNotifications } from "@/hooks/useNotifications";

const MainApp = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Set up notifications
  const { notificationPermission, requestNotificationPermission } = useNotifications({ user });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadUserProfile();
    getCurrentLocation();
    
    // Set up global friend request handler
    (window as any).sendFriendRequest = async (recipientUserId: string) => {
      if (!user) {
        console.error('No user logged in for friend request');
        return;
      }

      console.log('Sending friend request:', { from: user.id, to: recipientUserId });
      
      // Prevent sending friend request to yourself
      if (user.id === recipientUserId) {
        toast({
          title: "Invalid Request",
          description: "You cannot send a friend request to yourself",
          variant: "destructive"
        });
        return;
      }
      
      try {
        // Check if friendship already exists in any form
        const { data: existingFriendship, error: checkError } = await supabase
          .from('friendships')
          .select('status')
          .or(`and(requester_id.eq.${user.id},recipient_id.eq.${recipientUserId}),and(requester_id.eq.${recipientUserId},recipient_id.eq.${user.id})`)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing friendship:', checkError);
        }

        if (existingFriendship) {
          let message = "A friendship already exists";
          if (existingFriendship.status === 'pending') {
            message = "A friend request is already pending";
          } else if (existingFriendship.status === 'accepted') {
            message = "You are already friends";
          }
          
          toast({
            title: "Already Connected",
            description: message,
            variant: "destructive"
          });
          return;
        }

        // Check rate limit
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: rateLimitData, error: rateLimitError } = await supabase
          .from('friend_request_limits')
          .select('request_count')
          .eq('user_id', user.id)
          .gte('window_start', oneHourAgo)
          .maybeSingle();

        if (rateLimitError && rateLimitError.code !== 'PGRST116') {
          console.error('Error checking rate limit:', rateLimitError);
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
          .insert([{
            requester_id: user.id,
            recipient_id: recipientUserId,
            user_id: user.id, // This was missing!
            friend_id: recipientUserId, // This was missing!
            status: 'pending'
          }] as any);

        if (error) {
          console.error('Database error sending friend request:', error);
          toast({
            title: "Database Error",
            description: `Failed to send friend request: ${error.message}`,
            variant: "destructive"
          });
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

        console.log('Friend request sent successfully');
        toast({
          title: "Friend Request Sent",
          description: "Your friend request has been sent!",
        });
      } catch (error) {
        console.error('Unexpected error sending friend request:', error);
        toast({
          title: "Unexpected Error",
          description: `Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
      }
    };
  }, [user, navigate, toast]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      setUserProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Map - takes remaining space after bottom nav */}
        <div className="flex-1 relative min-h-0">
          <RealMapComponent />
          
          {/* Debug info for temporary events */}
          {process.env.NODE_ENV === 'development' && (
            <div className="absolute top-20 left-2 bg-black/80 text-white p-2 rounded text-xs z-50">
              Debug: Check console logs for event creation
            </div>
          )}
          
          {/* Floating header - very compact to avoid map controls */}
          <header className="absolute top-2 left-2 right-16 bg-background/90 backdrop-blur-sm rounded-md border px-2 py-1 flex items-center justify-between z-10 max-w-[300px]">
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-bold gradient-party bg-clip-text text-transparent">
                WorldMe
              </h1>
              <div className="text-xs text-muted-foreground truncate">
                {userProfile?.display_name || user?.user_metadata?.display_name || 'User'}
              </div>
            </div>
            
            <NotificationBell 
              notificationPermission={notificationPermission}
              requestNotificationPermission={requestNotificationPermission}
            />
          </header>

          {/* Location Toggle - Floating - adjusted for smaller header */}
          <LocationToggle user={user} />
        </div>

      {/* Bottom Navigation - Mobile optimized */}
      <div className="bg-card border-t shadow-lg shrink-0 safe-area-inset-bottom">
        <div className="flex justify-around items-center px-2 py-3 max-w-full mx-auto min-h-[64px]">
          <CreateEventDialog 
            user={user} 
            userLocation={userLocation}
            userZone={userProfile?.zone_key}
          />

          <MessagesDialog user={user} />

          <FriendRequestManager user={user} />

          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-2 px-2 min-w-0"
            onClick={() => navigate('/profile')}
          >
            <User className="h-5 w-5" />
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MainApp;