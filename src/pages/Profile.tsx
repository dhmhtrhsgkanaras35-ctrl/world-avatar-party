import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, LogOut } from "lucide-react";
import { EmojiColorPicker } from "@/components/EmojiColorPicker";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentEmoji, setCurrentEmoji] = useState('🙂');
  const [currentColor, setCurrentColor] = useState('#3B82F6');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadProfile();
  }, [user, navigate]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('emoji, emoji_color, display_name')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (profile) {
        const profileData = profile as any; // Type workaround
        setCurrentEmoji(profileData.emoji || '🙂');
        setCurrentColor(profileData.emoji_color || '#3B82F6');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  const handleSaveAvatar = async (emoji: string, color: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          emoji, 
          emoji_color: color,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      setCurrentEmoji(emoji);
      setCurrentColor(color);

      toast({
        title: "Success",
        description: "Your avatar has been updated!",
      });
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast({
        title: "Error",
        description: "Failed to update avatar",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/app')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Map
          </Button>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>
              Customize how you appear on the map to other users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Display Name</label>
                <p className="text-lg">{user.user_metadata?.display_name || 'User'}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <p className="text-lg">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avatar Customization */}
        <Card>
          <CardHeader>
            <CardTitle>Customize Your Avatar</CardTitle>
            <CardDescription>
              Choose an emoji and color to represent you on the map
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmojiColorPicker
              currentEmoji={currentEmoji}
              currentColor={currentColor}
              onSave={handleSaveAvatar}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
