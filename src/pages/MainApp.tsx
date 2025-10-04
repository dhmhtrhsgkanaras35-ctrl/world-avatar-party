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
      <header style={{
        position: 'absolute',
        top: '0.5rem',
        left: '0.5rem',
        right: '0.5rem',
        backgroundColor: 'hsl(var(--background) / 0.9)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: '0.5rem',
        border: '1px solid hsl(var(--border))',
        padding: '0.5rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
        paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0))'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flex: '1',
          minWidth: 0
        }}>
          <h1 style={{
            fontSize: '0.875rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, hsl(270 95% 65%), hsl(320 100% 70%), hsl(30 100% 60%))',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent'
          }}>
            WorldMe
          </h1>
          <div style={{
            fontSize: '0.75rem',
            color: 'hsl(var(--muted-foreground))',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}>
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
          <button
            onClick={() => setShowEmojiPalette(!showEmojiPalette)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.125rem',
              height: 'auto',
              padding: '0.25rem 0.5rem',
              minWidth: '50px',
              background: 'linear-gradient(135deg, hsl(270 95% 65%), hsl(320 100% 70%), hsl(30 100% 60%))',
              color: 'hsl(0 0% 98%)',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Plus style={{ width: '1.25rem', height: '1.25rem' }} />
            <span>Create</span>
          </button>

          <MessagesDialog user={user} />

          <FriendRequestManager user={user} />

          <button
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.125rem',
              height: 'auto',
              padding: '0.25rem 0.5rem',
              minWidth: '50px',
              background: 'linear-gradient(135deg, hsl(150 80% 55%), hsl(210 100% 70%))',
              color: 'hsl(0 0% 98%)',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <User style={{ width: '1.25rem', height: '1.25rem' }} />
            <span>Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainApp;