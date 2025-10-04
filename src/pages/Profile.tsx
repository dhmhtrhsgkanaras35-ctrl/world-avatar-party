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
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'hsl(var(--background))'
      }}>
        <Loader2 style={{
          width: '2rem',
          height: '2rem',
          animation: 'spin 1s linear infinite',
          color: 'hsl(var(--primary))'
        }} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, hsl(var(--background)), hsl(var(--muted)))',
      padding: '1rem',
      paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0))'
    }}>
      <div style={{
        maxWidth: '56rem',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        marginBottom: '6rem'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => navigate('/app')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              color: 'hsl(var(--foreground))',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--muted))';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
            Back to Map
          </button>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'hsl(var(--destructive))',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'hsl(var(--destructive-foreground))',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <LogOut style={{ width: '1rem', height: '1rem' }} />
            Sign Out
          </button>
        </div>

        {/* Profile Card */}
        <div style={{
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ padding: '1.5rem' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: 'hsl(var(--card-foreground))'
            }}>Your Profile</h2>
            <p style={{
              fontSize: '0.875rem',
              color: 'hsl(var(--muted-foreground))'
            }}>
              Customize how you appear on the map to other users
            </p>
          </div>
          <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'hsl(var(--foreground))'
                }}>Display Name</label>
                <p style={{
                  fontSize: '1.125rem',
                  marginTop: '0.25rem',
                  color: 'hsl(var(--card-foreground))'
                }}>{user.user_metadata?.display_name || 'User'}</p>
              </div>
              <div>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'hsl(var(--foreground))'
                }}>Email</label>
                <p style={{
                  fontSize: '1.125rem',
                  marginTop: '0.25rem',
                  color: 'hsl(var(--card-foreground))'
                }}>{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Avatar Customization */}
        <div style={{
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ padding: '1.5rem' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: 'hsl(var(--card-foreground))'
            }}>Your Current Avatar</h2>
            <p style={{
              fontSize: '0.875rem',
              color: 'hsl(var(--muted-foreground))'
            }}>
              This is how you appear on the map to other users
            </p>
          </div>
          <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
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
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: 'hsl(var(--primary))',
                      border: 'none',
                      borderRadius: '0.5rem',
                      color: 'hsl(var(--primary-foreground))',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    <Palette style={{ width: '1rem', height: '1rem' }} />
                    Customize Avatar
                  </button>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
