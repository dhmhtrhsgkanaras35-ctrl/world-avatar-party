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

      let avatarUrl: string | null = null;

      // Check if event data is the avatar URL string directly
      if (typeof event.data === 'string' && (event.data.endsWith('.glb') || event.data.endsWith('.vrm'))) {
        avatarUrl = event.data;
      }
      // Check if it's the structured event format
      else if (event.data?.eventName === 'v1.avatar.exported' && event.data?.data?.url) {
        avatarUrl = event.data.data.url;
      }

      if (avatarUrl) {
        console.log('Avatar URL captured:', avatarUrl);
        // Generate PNG snapshot from GLB model
        const pngUrl = await generateAvatarPNG(avatarUrl);
        if (pngUrl) {
          await saveAvatarUrl(pngUrl);
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

  // Generate PNG snapshot from GLB model
  const generateAvatarPNG = async (glbUrl: string): Promise<string | null> => {
    console.log('Generating PNG from GLB:', glbUrl);
    
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 1024; // Taller for full body
      const renderer = new THREE.WebGLRenderer({ 
        canvas, 
        alpha: true, 
        antialias: true,
        preserveDrawingBuffer: true 
      });
      renderer.setSize(512, 1024);
      renderer.setClearColor(0x000000, 0); // Transparent background
      
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(25, 512/1024, 0.1, 1000);
      camera.position.set(0, 0.8, 5);
      camera.lookAt(0, 0.3, 0);
      
      // Add lighting for good visibility
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
      directionalLight.position.set(2, 3, 2);
      directionalLight.castShadow = false;
      scene.add(directionalLight);
      
      // Add fill light from the other side
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
      fillLight.position.set(-2, 1, 2);
      scene.add(fillLight);
      
      // Load GLB model
      const loader = new GLTFLoader();
      loader.load(glbUrl, 
        (gltf) => {
          const model = gltf.scene;
          
          // Center and scale the model for full body view
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          // Position model to show full body
          model.position.x = -center.x;
          model.position.y = -center.y - size.y * 0.4; // Show from feet up
          model.position.z = -center.z;
          
          // Scale to fit nicely in frame, showing full body
          const maxDimension = Math.max(size.x, size.y, size.z);
          const scale = 1.6 / maxDimension;
          model.scale.setScalar(scale);
          
          scene.add(model);
          
          // Render the scene
          renderer.render(scene, camera);
          
          // Convert to PNG blob and create URL
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              console.log('Generated PNG blob URL:', url);
              resolve(url);
            } else {
              console.error('Failed to create blob');
              resolve(null);
            }
          }, 'image/png', 1.0);
          
          // Cleanup
          renderer.dispose();
          scene.clear();
        },
        (progress) => {
          console.log('Loading progress:', progress);
        },
        (error) => {
          console.error('Error loading GLB:', error);
          renderer.dispose();
          resolve(null);
        }
      );
    });
  };

  const saveAvatarUrl = async (avatarUrl: string) => {
    setIsSaving(true);
    try {
      console.log('=== AVATAR SAVE DEBUG ===');
      console.log('Avatar URL:', avatarUrl);
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
      
      // Prepare the profile data
      let profileData: any = {
        user_id: userId,
        avatar_url: avatarUrl,
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

      console.log('Avatar saved successfully:', data);
      
      toast({
        title: "Avatar Created!",
        description: "Your Ready Player Me avatar has been saved successfully.",
      });

      onAvatarCreated?.(avatarUrl);
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