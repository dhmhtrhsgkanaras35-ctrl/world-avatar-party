import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReadyPlayerMeCreator } from "@/components/ReadyPlayerMeCreator";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Avatar3D } from "@/components/Avatar3D";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [readyPlayerMeUrl, setReadyPlayerMeUrl] = useState<string | null>(null);
  const [showRPMCreator, setShowRPMCreator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadProfile();
  }, [user, navigate]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      console.log('🔍 Loading profile for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('📊 Profile query result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error loading profile:', error);
        return;
      }

      if (data?.avatar_url) {
        console.log('✅ Profile loaded with avatar_url:', data.avatar_url);
        
        // Test the URL directly
        const testImg = new Image();
        testImg.crossOrigin = 'anonymous';
        testImg.onload = () => {
          console.log('✅ Avatar URL test - Image loads successfully!');
        };
        testImg.onerror = (e) => {
          console.error('❌ Avatar URL test - Image failed to load:', e);
          console.error('❌ Trying without CORS...');
          
          // Test without CORS
          const testImg2 = new Image();
          testImg2.onload = () => {
            console.log('✅ Avatar loads without CORS - CORS is the issue!');
          };
          testImg2.onerror = (e2) => {
            console.error('❌ Avatar fails even without CORS:', e2);
          };
          testImg2.src = data.avatar_url;
        };
        testImg.src = data.avatar_url;
        
        // Add cache-busting parameter to prevent browser caching issues
        const avatarUrl = data.avatar_url.includes('?') 
          ? `${data.avatar_url}&t=${Date.now()}`
          : `${data.avatar_url}?t=${Date.now()}`;
        console.log('🔄 Setting readyPlayerMeUrl to:', avatarUrl);
        setReadyPlayerMeUrl(avatarUrl);
      } else {
        console.log('❌ No avatar_url found in profile data:', data);
      }
    } catch (error) {
      console.error('❌ Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-party bg-clip-text text-transparent">
              Your Profile
            </h1>
            <p className="text-muted-foreground">
              Customize your avatar and manage your account
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/')}>
              ← Back to Home
            </Button>
            <Button variant="destructive" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">My Profile</h1>
            <p className="text-muted-foreground">Manage your avatar and profile information</p>
          </div>

          {/* Snapchat-style Full-body Avatar Display */}
          <div className="flex justify-center">
            {readyPlayerMeUrl ? (
              <div className="w-48 h-96 flex items-end justify-center relative border-2 border-dashed border-gray-300">
                <img 
                  src={readyPlayerMeUrl} 
                  alt="Your Avatar"
                  className="max-w-full max-h-full object-contain object-bottom filter drop-shadow-lg"
                  style={{ display: 'block' }}
                  onLoad={(e) => {
                    console.log('✅ Profile avatar image loaded successfully:', readyPlayerMeUrl);
                    const img = e.target as HTMLImageElement;
                    console.log('📐 Image dimensions:', img.naturalWidth, 'x', img.naturalHeight);
                  }}
                  onError={(e) => {
                    console.error('❌ Profile avatar image failed to load:', readyPlayerMeUrl);
                    console.error('❌ Image error event:', e);
                    // Show fallback
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                  }}
                />
                {/* Debug info */}
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded z-10">
                  Avatar URL: {readyPlayerMeUrl.substring(0, 50)}...
                </div>
              </div>
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center text-white shadow-xl">
                <div className="text-center">
                  <div className="text-6xl">👤</div>
                  <div className="text-xs mt-2">No Avatar</div>
                </div>
              </div>
            )}
          </div>

          {/* Create Avatar Button */}
          <div className="text-center">
            <Button 
              onClick={() => setShowRPMCreator(true)}
              className="gradient-party border-0"
              size="lg"
            >
              🎭 {readyPlayerMeUrl ? 'Update' : 'Create'} Avatar
            </Button>
          </div>
        </div>

        {/* Ready Player Me Creator Modal */}
        {showRPMCreator && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg p-6">
          <ReadyPlayerMeCreator
            userId={user.id}
            onAvatarCreated={(url) => {
              setReadyPlayerMeUrl(url);
              setShowRPMCreator(false);
              // Reload profile to sync with database
              loadProfile();
            }}
            onSkip={() => setShowRPMCreator(false)}
            showSkipOption={true}
          />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;