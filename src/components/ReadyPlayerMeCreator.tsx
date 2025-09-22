import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
      if (event.origin !== 'https://demo.readyplayer.me') return;

      if (event.data?.eventName === 'v1.avatar.exported') {
        const avatarUrl = event.data.data.url;
        await saveAvatarUrl(avatarUrl);
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

  const saveAvatarUrl = async (avatarUrl: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          avatar_url: avatarUrl
        });

      if (error) throw error;

      toast({
        title: "Avatar Created!",
        description: "Your Ready Player Me avatar has been saved successfully.",
      });

      onAvatarCreated?.(avatarUrl);
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save avatar",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
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