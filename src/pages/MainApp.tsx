import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RealMapComponent } from "@/components/RealMapComponent";
import { FriendRequestManager } from "@/components/FriendRequestManager";
import { LocationToggle } from "@/components/LocationToggle";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Users, MessageCircle, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { MessagesDialog } from "@/components/MessagesDialog";

const MainApp = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadUserProfile();
    getCurrentLocation();
    
    // Set up global friend request handler
    (window as any).sendFriendRequest = async (recipientUserId: string) => {
      if (!user) return;
      
      try {
        const { error } = await supabase
          .from('friendships')
          .insert({
            requester_id: user.id,
            recipient_id: recipientUserId,
            status: 'pending'
          } as any);

        if (error) {
          if (error.code === '23505') {
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

        toast({
          title: "Friend Request Sent",
          description: "Your friend request has been sent!",
        });
      } catch (error) {
        console.error('Error sending friend request:', error);
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
      <div className="flex flex-col h-screen">
        {/* Map - takes full screen */}
        <div className="flex-1 relative">
          <RealMapComponent />
          
          {/* Floating header - smaller and positioned to avoid map controls */}
          <header className="absolute top-4 left-4 right-20 bg-background/80 backdrop-blur-sm rounded-lg border p-2 flex items-center justify-between z-10">
            <h1 className="text-sm font-bold gradient-party bg-clip-text text-transparent">
              WorldMe
            </h1>
            <div className="text-xs text-muted-foreground truncate">
              {userProfile?.display_name || user?.user_metadata?.display_name || 'User'}
            </div>
          </header>

          {/* Location Toggle - Floating - adjusted for smaller header */}
          <LocationToggle user={user} />
        </div>

      {/* Bottom Navigation */}
      <div className="bg-card border-t p-3 shadow-lg">
        <div className="flex justify-around items-center max-w-full mx-auto">
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