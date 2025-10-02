import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { RealMapComponent } from "@/components/RealMapComponent";

const MainApp = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showEmojiPalette, setShowEmojiPalette] = useState(false);
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
            user_id: user.id,
            friend_id: recipientUserId,
            status: 'pending'
          }]);

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
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      width: '100%', 
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Floating header - Mobile optimized */}
      <header className="absolute top-2 left-2 right-2 bg-background/90 backdrop-blur-sm rounded-lg border px-3 py-2 flex items-center justify-between z-10 safe-area-inset-top">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="text-sm font-bold gradient-party bg-clip-text text-transparent">
            WorldMe
          </h1>
          <div className="text-xs text-muted-foreground truncate flex-1">
            {userProfile?.display_name || user?.user_metadata?.display_name || 'User'}
          </div>
        </div>
        
        <NotificationBell 
          notificationPermission={notificationPermission}
          requestNotificationPermission={requestNotificationPermission}
        />
      </header>

      {/* Location Toggle - Floating */}
      <LocationToggle user={user} />

      {/* Map - fills entire screen */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        width: '100%', 
        height: '100%' 
      }}>
        <RealMapComponent 
          showEmojiPalette={showEmojiPalette} 
          onToggleEmojiPalette={() => setShowEmojiPalette(!showEmojiPalette)}
          userLocation={userLocation}
          userZone={userProfile?.zone_key}
        />
      </div>

      {/* Bottom Navigation - Mobile optimized with safe area */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: 'hsl(var(--card) / 0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderTop: '1px solid hsl(var(--border) / 0.2)',
        boxShadow: '0 -20px 25px -5px rgba(0, 0, 0, 0.1), 0 -10px 10px -5px rgba(0, 0, 0, 0.04)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0.25rem 0.5rem',
          maxWidth: '100%',
          margin: '0 auto',
          minHeight: '48px'
        }}>
          <Button
            variant="ghost"
            size="sm"
            style={{
              background: 'linear-gradient(135deg, hsl(270 95% 65%), hsl(320 100% 70%), hsl(30 100% 60%))',
              color: 'hsl(0 0% 98%)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            className="flex flex-col items-center gap-0.5 h-auto py-1 px-2 min-w-[50px] hover:scale-105 active:scale-95"
            onClick={() => setShowEmojiPalette(!showEmojiPalette)}
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs font-semibold">Create</span>
          </Button>

          <MessagesDialog user={user} />

          <FriendRequestManager user={user} />

          <Button
            variant="ghost"
            size="sm"
            style={{
              background: 'linear-gradient(135deg, hsl(150 80% 55%), hsl(210 100% 70%))',
              color: 'hsl(0 0% 98%)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            className="flex flex-col items-center gap-0.5 h-auto py-1 px-2 min-w-[50px] hover:scale-105 active:scale-95"
            onClick={() => navigate('/profile')}
          >
            <User className="h-5 w-5" />
            <span className="text-xs font-semibold">Profile</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MainApp;