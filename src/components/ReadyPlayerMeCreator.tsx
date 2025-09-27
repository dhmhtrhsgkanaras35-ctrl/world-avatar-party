import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as THREE from 'three';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface ReadyPlayerMeCreatorProps {
  userId: string;
  onAvatarCreated?: (avatarUrl: string) => void;
  onSkip?: () => void;
  showSkipOption?: boolean;
}

export const ReadyPlayerMeCreator = ({ 
  userId, 
  onAvatarCreated, 
  onSkip, 
  showSkipOption = false 
}: ReadyPlayerMeCreatorProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const openAvatarCreator = () => {
    setIsCreating(true);
    
    // Create iframe for Ready Player Me
    const iframe = document.createElement('iframe');
    iframe.src = 'https://demo.readyplayer.me/avatar?frameApi';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.allow = 'camera *; microphone *';

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';

    // Create modal container
    const modal = document.createElement('div');
    modal.style.width = '90%';
    modal.style.height = '90%';
    modal.style.maxWidth = '800px';
    modal.style.maxHeight = '600px';
    modal.style.backgroundColor = 'white';
    modal.style.borderRadius = '12px';
    modal.style.overflow = 'hidden';
    modal.style.position = 'relative';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '15px';
    closeBtn.style.background = 'rgba(0, 0, 0, 0.5)';
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.zIndex = '10000';
    closeBtn.style.width = '30px';
    closeBtn.style.height = '30px';
    closeBtn.style.borderRadius = '50%';

    // Event listener for Ready Player Me messages
    const handleMessage = async (event: MessageEvent) => {
      console.log('=== RPM MESSAGE EVENT ===');
      console.log('Event origin:', event.origin);
      console.log('Event data:', event.data);
      
      if (event.origin !== 'https://demo.readyplayer.me') return;

      let avatarGlbUrl: string | null = null;

      // Check if event data is the avatar URL string directly
      if (typeof event.data === 'string' && (event.data.endsWith('.glb') || event.data.endsWith('.vrm'))) {
        avatarGlbUrl = event.data;
      }
      // Check if it's the structured event format
      else if (event.data?.eventName === 'v1.avatar.exported' && event.data?.data?.url) {
        avatarGlbUrl = event.data.data.url;
      }

      if (avatarGlbUrl) {
        console.log('Avatar GLB URL captured:', avatarGlbUrl);
        // Extract avatar ID from GLB URL and create Ready Player Me PNG URL
        const avatarId = extractAvatarIdFromUrl(avatarGlbUrl);
        if (avatarId) {
          const pngUrl = `https://render.readyplayer.me/avatar/${avatarId}.png?pose=relaxed&quality=high&transparent=true`;
          console.log('Ready Player Me PNG URL:', pngUrl);
          await saveAvatarUrl(pngUrl);
        } else {
          console.error('Could not extract avatar ID from URL:', avatarGlbUrl);
        }
        cleanup();
      }
    };

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      document.body.removeChild(overlay);
      setIsCreating(false);
    };

    closeBtn.onclick = cleanup;
    overlay.onclick = (e) => {
      if (e.target === overlay) cleanup();
    };

    window.addEventListener('message', handleMessage);

    modal.appendChild(closeBtn);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  };

  // Extract avatar ID from Ready Player Me URL
  const extractAvatarIdFromUrl = (url: string): string | null => {
    // Extract avatar ID from URLs like:
    // https://models.readyplayer.me/64bfa597e1b8ff9c4e5b4a7d/avatar.glb
    // https://api.readyplayer.me/v1/avatars/64bfa597e1b8ff9c4e5b4a7d.glb
    const matches = url.match(/([a-f0-9]{24})/);
    return matches ? matches[1] : null;
  };

  const saveAvatarUrl = async (avatarPngUrl: string) => {
    setIsSaving(true);
    try {
      console.log('=== AVATAR SAVE DEBUG ===');
      console.log('Ready Player Me PNG URL:', avatarPngUrl);
      console.log('User ID:', userId);
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('Current authenticated user:', user);
      console.log('Auth error:', authError);
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      if (user.id !== userId) {
        console.warn('User ID mismatch:', { authenticated: user.id, provided: userId });
      }
      
      // First, try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
        
      console.log('Existing profile:', existingProfile);
      console.log('Fetch error:', fetchError);
      
      // Prepare the profile data with Ready Player Me PNG URL
      let profileData: any = {
        user_id: userId,
        avatar_url: avatarPngUrl, // Store the Ready Player Me PNG URL directly
        pose: 'idle', // Default pose for Ready Player Me avatars
        updated_at: new Date().toISOString()
      };
      
      // If no existing profile, add required fields
      if (!existingProfile) {
        profileData.display_name = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
        profileData.username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
        console.log('Creating new profile with data:', profileData);
      } else {
        console.log('Updating existing profile with data:', profileData);
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'user_id'
        })
        .select();

      console.log('Upsert result:', data);
      console.log('Upsert error:', error);

      if (error) {
        console.error('Supabase upsert error:', error);
        throw error;
      }

      console.log('Avatar URL saved successfully:', data);
      
      toast({
        title: "Avatar Created!",
        description: "Your Ready Player Me avatar has been saved successfully.",
      });

      onAvatarCreated?.(avatarPngUrl);
    } catch (error: any) {
      console.error('=== SAVE AVATAR ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      
      toast({
        title: "Save Failed",
        description: `Failed to save avatar: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      console.log('=== AVATAR SAVE DEBUG END ===');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center gradient-party bg-clip-text text-transparent">
          Create Your Avatar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-muted-foreground">
          Create a personalized 3D avatar that represents you in WorldMe
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={openAvatarCreator}
            disabled={isCreating || isSaving}
            className="w-full gradient-party border-0"
            size="lg"
          >
            {isCreating ? "Opening Creator..." : isSaving ? "Saving..." : "🎭 Create Avatar"}
          </Button>
          
          {showSkipOption && (
            <Button 
              variant="outline" 
              onClick={onSkip}
              disabled={isCreating || isSaving}
              className="w-full"
            >
              Skip for Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};