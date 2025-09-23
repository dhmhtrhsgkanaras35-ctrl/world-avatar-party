import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RealMapComponent } from "@/components/RealMapComponent";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Users, MessageCircle, User } from "lucide-react";

const MainApp = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadUserProfile();
  }, [user, navigate]);

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold gradient-party bg-clip-text text-transparent">
          WorldMe
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {userProfile?.display_name || user.user_metadata?.display_name || 'User'}
          </span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/profile')}
          >
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Full Map */}
      <div className="flex-1 relative">
        <RealMapComponent />
      </div>

      {/* Bottom Navigation */}
      <div className="bg-card border-t p-3 shadow-lg">
        <div className="flex justify-around items-center max-w-full mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-2 px-2 min-w-0"
            onClick={() => {
              // TODO: Implement create event
              alert('Create Event feature coming soon!');
            }}
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs">Create</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-2 px-2 min-w-0"
            onClick={() => {
              // TODO: Implement friends
              alert('Friends feature coming soon!');
            }}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">Friends</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-2 px-2 min-w-0"
            onClick={() => {
              // TODO: Implement messages
              alert('Messages feature coming soon!');
            }}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-xs">Messages</span>
          </Button>

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