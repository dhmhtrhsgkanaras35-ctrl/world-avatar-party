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

  // Generate PNG snapshot from GLB model with Snapchat-style natural pose
  const generateAvatarPNG = async (glbUrl: string): Promise<string | null> => {
    console.log('Generating Snapchat-style PNG from GLB:', glbUrl);
    
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 800; // 1:2 ratio for natural full body
      const renderer = new THREE.WebGLRenderer({ 
        canvas, 
        alpha: true, 
        antialias: true,
        preserveDrawingBuffer: true 
      });
      renderer.setSize(400, 800);
      renderer.setClearColor(0x000000, 0); // Transparent background
      
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 400/800, 0.1, 1000);
      
      // Camera positioned for natural standing view (slightly elevated, front-facing)
      camera.position.set(0, 1.2, 4);
      camera.lookAt(0, 0.9, 0); // Look at upper torso for natural framing
      
      // Soft, even lighting setup for clean cutout appearance
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambientLight);
      
      // Front key light
      const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
      keyLight.position.set(0, 2, 3);
      scene.add(keyLight);
      
      // Gentle fill lights from sides to eliminate harsh shadows
      const fillLeft = new THREE.DirectionalLight(0xffffff, 0.4);
      fillLeft.position.set(-2, 1, 1);
      scene.add(fillLeft);
      
      const fillRight = new THREE.DirectionalLight(0xffffff, 0.4);
      fillRight.position.set(2, 1, 1);
      scene.add(fillRight);
      
      // Load GLB model
      const loader = new GLTFLoader();
      loader.load(glbUrl, 
        (gltf) => {
          const model = gltf.scene;
          
          // Apply natural relaxed pose if possible
          model.traverse((child) => {
            if (child.type === 'Bone' || (child as any).isBone) {
              // Apply subtle relaxed rotations to key bones for natural stance
              if (child.name.includes('LeftArm') || child.name.includes('L_upperarm')) {
                child.rotation.z = 0.1; // Slight arm relaxation
              }
              if (child.name.includes('RightArm') || child.name.includes('R_upperarm')) {
                child.rotation.z = -0.1;
              }
              if (child.name.includes('LeftForeArm') || child.name.includes('L_forearm')) {
                child.rotation.z = 0.15;
              }
              if (child.name.includes('RightForeArm') || child.name.includes('R_forearm')) {
                child.rotation.z = -0.15;
              }
              // Slight hip shift for natural stance
              if (child.name.includes('Hips') || child.name.includes('pelvis')) {
                child.rotation.z = 0.02;
              }
            }
          });
          
          // Position and scale for Snapchat-style full body cutout
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          // Center horizontally, align feet to bottom of frame
          model.position.x = -center.x;
          model.position.y = -box.min.y; // Feet at ground level (y=0)
          model.position.z = -center.z;
          
          // Scale to fill frame height while maintaining proportions
          const scaleForHeight = 1.8 / size.y; // Leaves some margin
          model.scale.setScalar(scaleForHeight);
          
          scene.add(model);
          
          // Render multiple times to ensure proper lighting
          renderer.render(scene, camera);
          
          // Small delay to ensure rendering is complete
          setTimeout(() => {
            renderer.render(scene, camera);
            
            // Convert to PNG blob and create URL
            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                console.log('Generated Snapchat-style PNG:', url);
                resolve(url);
              } else {
                console.error('Failed to create PNG blob');
                resolve(null);
              }
            }, 'image/png', 1.0);
            
            // Cleanup
            renderer.dispose();
            scene.clear();
          }, 100);
        },
        (progress) => {
          console.log('Avatar loading progress:', progress);
        },
        (error) => {
          console.error('Error loading GLB for PNG generation:', error);
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