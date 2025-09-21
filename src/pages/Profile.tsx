import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarCustomizer, AvatarConfig } from "@/components/AvatarCustomizer";
import { RealisticAvatar } from "@/components/RealisticAvatar";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(null);
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (data?.avatar_url) {
        try {
          const config = JSON.parse(data.avatar_url);
          setAvatarConfig(config);
        } catch (e) {
          console.error('Error parsing avatar config:', e);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
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

        {/* Profile Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="w-20 h-20">
              {avatarConfig ? (
                <RealisticAvatar 
                  config={avatarConfig}
                  size="large"
                  animated
                  status="online"
                />
              ) : (
                <div className="w-full h-full bg-muted rounded-full flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold">
                {user.user_metadata?.display_name || 'No name set'}
              </h3>
              <p className="text-muted-foreground">
                @{user.user_metadata?.username || 'No username set'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {user.email}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Avatar Customizer */}
        <AvatarCustomizer
          userId={user.id}
          initialConfig={avatarConfig || undefined}
          onConfigChange={setAvatarConfig}
        />
      </div>
    </div>
  );
};

export default Profile;