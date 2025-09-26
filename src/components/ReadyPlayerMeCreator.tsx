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

  // Generate PNG snapshot from GLB model with natural idle animation
  const generateAvatarPNG = async (glbUrl: string): Promise<string | null> => {
    console.log('Generating natural idle pose PNG from GLB:', glbUrl);
    
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 800; // Wider aspect ratio to include hands
      const renderer = new THREE.WebGLRenderer({ 
        canvas, 
        alpha: true, 
        antialias: true,
        preserveDrawingBuffer: true 
      });
      renderer.setSize(500, 800);
      renderer.setClearColor(0x000000, 0); // Transparent background
      
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 500/800, 0.1, 1000); // Wider FOV
      
      // Camera positioned for natural standing view (slightly elevated, front-facing)
      camera.position.set(0, 1.2, 4.5); // Moved camera back slightly
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
      
      // Animation mixer for handling animations
      let mixer: THREE.AnimationMixer | null = null;
      
      // Load GLB model
      const loader = new GLTFLoader();
      loader.load(glbUrl, 
        (gltf) => {
          const model = gltf.scene;
          
          // Check for animations in the model
          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            
            // Look for idle animation or use the first available animation
            const idleAnimation = gltf.animations.find(animation => 
              animation.name.toLowerCase().includes('idle') || 
              animation.name.toLowerCase().includes('breathing') ||
              animation.name.toLowerCase().includes('stand')
            ) || gltf.animations[0];
            
            if (idleAnimation) {
              const idleAction = mixer.clipAction(idleAnimation);
              idleAction.setLoop(THREE.LoopRepeat, Infinity);
              idleAction.play();
              
              // Let animation play for a moment to settle into natural pose
              setTimeout(() => renderFrame(), 200);
            } else {
              applyManualIdlePose(model);
              renderFrame();
            }
          } else {
            // No animations found, apply manual idle pose
            applyManualIdlePose(model);
            renderFrame();
          }
          
          function applyManualIdlePose(model: THREE.Group) {
            // Apply natural relaxed idle pose with arms hanging down
            model.traverse((child) => {
              if (child.type === 'Bone' || (child as any).isBone) {
                const boneName = child.name.toLowerCase();
                
                // Natural arm positioning - arms hanging naturally at sides
                if (boneName.includes('leftarm') || boneName.includes('l_upperarm') || boneName.includes('leftupperarm')) {
                  child.rotation.x = 0.15;  // More natural forward hang
                  child.rotation.z = 0.1;   // Closer to body
                  child.rotation.y = 0.08;  // Slight outward rotation
                }
                if (boneName.includes('rightarm') || boneName.includes('r_upperarm') || boneName.includes('rightupperarm')) {
                  child.rotation.x = 0.15;  // More natural forward hang
                  child.rotation.z = -0.1;  // Closer to body
                  child.rotation.y = -0.08; // Slight outward rotation
                }
                
                // Natural forearm - completely relaxed hanging
                if (boneName.includes('leftforearm') || boneName.includes('l_forearm') || boneName.includes('leftlowerarm')) {
                  child.rotation.x = 0.4;   // Natural hanging down
                  child.rotation.z = 0.05;  // Slight inward curve
                  child.rotation.y = 0.02;  // Natural twist
                }
                if (boneName.includes('rightforearm') || boneName.includes('r_forearm') || boneName.includes('rightlowerarm')) {
                  child.rotation.x = 0.4;   // Natural hanging down
                  child.rotation.z = -0.05; // Slight inward curve
                  child.rotation.y = -0.02; // Natural twist
                }
                
                // Natural hand positioning - completely relaxed
                if (boneName.includes('lefthand') || boneName.includes('l_hand')) {
                  child.rotation.x = 0.15;  // Slight forward curl
                  child.rotation.y = 0.05;  // Natural position
                  child.rotation.z = 0.02;  // Relaxed
                }
                if (boneName.includes('righthand') || boneName.includes('r_hand')) {
                  child.rotation.x = 0.15;  // Slight forward curl
                  child.rotation.y = -0.05; // Natural position
                  child.rotation.z = -0.02; // Relaxed
                }
                
                // Subtle weight shift for natural stance
                if (boneName.includes('hips') || boneName.includes('pelvis')) {
                  child.rotation.z = 0.02; // Very slight lean
                  child.rotation.x = 0.01; // Slight forward tilt
                }
                if (boneName.includes('spine') || boneName.includes('chest')) {
                  child.rotation.z = -0.01; // Counter hip lean
                  child.rotation.x = -0.005; // Slight counter-tilt
                }
                
                // Natural head position - alert but relaxed
                if (boneName.includes('head') || boneName.includes('neck')) {
                  child.rotation.x = 0.02;  // Very slight chin down
                  child.rotation.z = -0.01; // Minimal tilt
                  child.rotation.y = 0.01;  // Slight turn
                }
                
                // Natural leg positioning - balanced stance
                if (boneName.includes('leftupperleg') || boneName.includes('leftthigh') || boneName.includes('l_thigh')) {
                  child.rotation.x = 0.03;  // Slight forward
                  child.rotation.z = -0.01; // Weight-bearing leg
                }
                if (boneName.includes('rightupperleg') || boneName.includes('rightthigh') || boneName.includes('r_thigh')) {
                  child.rotation.x = 0.02;  // Slightly less weight
                  child.rotation.z = 0.02;  // Relaxed leg
                }
              }
            });
          }
          
          function renderFrame() {
            // Position and scale for full body cutout with feet aligned to bottom
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            // Center horizontally, align feet to bottom of frame
            model.position.x = -center.x;
            model.position.y = -box.min.y; // Feet at ground level (y=0)
            model.position.z = -center.z;
            
            // Scale to fit both height and width with margin for hands
            const scaleForHeight = 1.7 / size.y; // Slightly smaller to ensure full body fits
            const scaleForWidth = 1.6 / size.x;  // Ensure arms/hands don't get cut off
            const finalScale = Math.min(scaleForHeight, scaleForWidth); // Use smaller scale
            model.scale.setScalar(finalScale);
            
            scene.add(model);
            
            // Update animation if available
            if (mixer) {
              mixer.update(0.016); // Simulate 60fps frame
            }
            
            // Render multiple times to ensure proper lighting
            renderer.render(scene, camera);
            
            // Small delay to ensure rendering is complete
            setTimeout(() => {
              renderer.render(scene, camera);
              
              // Convert to PNG blob and create URL
              canvas.toBlob((blob) => {
                if (blob) {
                  const url = URL.createObjectURL(blob);
                  console.log('Generated natural idle PNG:', url);
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
          }
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
      console.log('Avatar PNG Blob URL:', avatarUrl);
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

      // Convert blob URL to file for upload
      const response = await fetch(avatarUrl);
      const blob = await response.blob();
      const fileName = `${userId}/avatar.png`;
      
      console.log('Uploading avatar PNG to storage:', fileName);
      
      // Check if avatar already exists and delete it
      const { data: existingFile } = await supabase.storage
        .from('avatars')
        .list(userId);
        
      if (existingFile && existingFile.length > 0) {
        console.log('Removing old avatar file');
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([`${userId}/avatar.png`]);
        if (deleteError) {
          console.warn('Error deleting old avatar:', deleteError);
        }
      }
      
      // Upload new avatar PNG to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/png'
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('Avatar uploaded to storage:', uploadData);

      // Get public URL for the uploaded avatar
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
        
      console.log('Avatar public URL:', publicUrl);
      
      // First, try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
        
      console.log('Existing profile:', existingProfile);
      console.log('Fetch error:', fetchError);
      
      // Prepare the profile data with storage URL
      let profileData: any = {
        user_id: userId,
        avatar_url: publicUrl,
        pose: 'idle', // Default pose for all avatars
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

      console.log('Avatar saved successfully to storage:', data);
      
      toast({
        title: "Avatar Created!",
        description: "Your Ready Player Me avatar has been saved successfully.",
      });

      // Clean up the blob URL
      URL.revokeObjectURL(avatarUrl);

      onAvatarCreated?.(publicUrl);
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