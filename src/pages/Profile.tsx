import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, LogOut, Palette } from "lucide-react";
import { EmojiColorPicker } from "@/components/EmojiColorPicker";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentEmoji, setCurrentEmoji] = useState('🙂');
  const [currentColor, setCurrentColor] = useState('#3B82F6');
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);

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
      
      setShowAvatarDialog(false);
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8 pb-safe">
      <div className="max-w-4xl mx-auto space-y-6 mb-24">
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
            <CardTitle>Your Current Avatar</CardTitle>
            <CardDescription>
              This is how you appear on the map to other users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div 
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  backgroundColor: currentColor
                }}
              >
                <span style={{ fontSize: '48px' }}>{currentEmoji}</span>
              </div>
              
              <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Palette className="h-4 w-4" />
                    Customize Avatar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] w-full max-h-[85vh] p-0 gap-0">
                  <DialogHeader className="p-4 pb-2">
                    <DialogTitle>Customize Your Avatar</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[calc(85vh-80px)] px-4 pb-4">
                    <EmojiColorPicker
                      currentEmoji={currentEmoji}
                      currentColor={currentColor}
                      onSave={handleSaveAvatar}
                    />
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
