import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { RealisticAvatar } from "./RealisticAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AvatarConfig {
  skinTone: number;
  hairStyle: number;
  hairColor: string;
  eyeColor: string;
  faceShape: number;
  clothing: number;
  accessory: number;
  gender: 'male' | 'female' | 'non-binary';
}

const defaultConfig: AvatarConfig = {
  skinTone: 2,
  hairStyle: 1,
  hairColor: '#8B4513',
  eyeColor: '#4A90E2',
  faceShape: 1,
  clothing: 1,
  accessory: 0,
  gender: 'male'
};

interface AvatarCustomizerProps {
  userId?: string;
  onConfigChange?: (config: AvatarConfig) => void;
  initialConfig?: AvatarConfig;
}

export const AvatarCustomizer = ({ userId, onConfigChange, initialConfig }: AvatarCustomizerProps) => {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig || defaultConfig);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const skinTones = [
    '#FDBCB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#654321'
  ];

  const hairColors = [
    '#000000', '#8B4513', '#D2B48C', '#FFD700', '#FF6347', '#4B0082', '#32CD32'
  ];

  const eyeColors = [
    '#4A90E2', '#8B4513', '#228B22', '#FFD700', '#9370DB', '#FF69B4'
  ];

  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(config);
    }
  }, [config, onConfigChange]);

  const updateConfig = (key: keyof AvatarConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveAvatar = async () => {
    if (!userId) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: JSON.stringify(config)
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Avatar Saved!",
        description: "Your custom avatar has been updated successfully.",
      });
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

  const randomizeAvatar = () => {
    const randomConfig: AvatarConfig = {
      skinTone: Math.floor(Math.random() * skinTones.length),
      hairStyle: Math.floor(Math.random() * 6) + 1,
      hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
      eyeColor: eyeColors[Math.floor(Math.random() * eyeColors.length)],
      faceShape: Math.floor(Math.random() * 3) + 1,
      clothing: Math.floor(Math.random() * 5) + 1,
      accessory: Math.floor(Math.random() * 4),
      gender: ['male', 'female', 'non-binary'][Math.floor(Math.random() * 3)] as any
    };
    setConfig(randomConfig);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      {/* Avatar Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Avatar Preview</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div className="w-48 h-48">
            <RealisticAvatar config={config} size="large" animated />
          </div>
        </CardContent>
      </Card>

      {/* Customization Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Customize Your Look</CardTitle>
          <Button 
            variant="outline" 
            onClick={randomizeAvatar}
            className="text-sm"
          >
            🎲 Random
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Gender Selection */}
          <div className="space-y-2">
            <Label>Gender Expression</Label>
            <div className="flex gap-2">
              {['male', 'female', 'non-binary'].map((gender) => (
                <Button
                  key={gender}
                  variant={config.gender === gender ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateConfig('gender', gender)}
                  className="capitalize"
                >
                  {gender === 'male' ? '👨' : gender === 'female' ? '👩' : '🧑'} {gender}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Skin Tone */}
          <div className="space-y-2">
            <Label>Skin Tone</Label>
            <div className="flex flex-wrap gap-2">
              {skinTones.map((tone, index) => (
                <Button
                  key={index}
                  variant={config.skinTone === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateConfig('skinTone', index)}
                  className="w-8 h-8 p-0 rounded-full border-2"
                  style={{ backgroundColor: tone }}
                />
              ))}
            </div>
          </div>

          {/* Hair Style */}
          <div className="space-y-2">
            <Label>Hair Style</Label>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Button
                  key={i}
                  variant={config.hairStyle === i + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateConfig('hairStyle', i + 1)}
                >
                  Style {i + 1}
                </Button>
              ))}
            </div>
          </div>

          {/* Hair Color */}
          <div className="space-y-2">
            <Label>Hair Color</Label>
            <div className="flex flex-wrap gap-2">
              {hairColors.map((color) => (
                <Button
                  key={color}
                  variant={config.hairColor === color ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateConfig('hairColor', color)}
                  className="w-8 h-8 p-0 rounded-full border-2"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Eye Color */}
          <div className="space-y-2">
            <Label>Eye Color</Label>
            <div className="flex flex-wrap gap-2">
              {eyeColors.map((color) => (
                <Button
                  key={color}
                  variant={config.eyeColor === color ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateConfig('eyeColor', color)}
                  className="w-8 h-8 p-0 rounded-full border-2"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Face Shape */}
          <div className="space-y-2">
            <Label>Face Shape</Label>
            <div className="grid grid-cols-3 gap-2">
              {['Oval', 'Round', 'Square'].map((shape, index) => (
                <Button
                  key={index}
                  variant={config.faceShape === index + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateConfig('faceShape', index + 1)}
                >
                  {shape}
                </Button>
              ))}
            </div>
          </div>

          {/* Clothing */}
          <div className="space-y-2">
            <Label>Clothing</Label>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Button
                  key={i}
                  variant={config.clothing === i + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateConfig('clothing', i + 1)}
                >
                  Outfit {i + 1}
                </Button>
              ))}
            </div>
          </div>

          {/* Accessories */}
          <div className="space-y-2">
            <Label>Accessories</Label>
            <div className="grid grid-cols-2 gap-2">
              {['None', 'Glasses', 'Hat', 'Earrings'].map((accessory, index) => (
                <Button
                  key={index}
                  variant={config.accessory === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateConfig('accessory', index)}
                >
                  {accessory}
                </Button>
              ))}
            </div>
          </div>

          {userId && (
            <>
              <Separator />
              <Button 
                onClick={saveAvatar}
                disabled={isSaving}
                className="w-full gradient-party border-0"
              >
                {isSaving ? "Saving..." : "💾 Save Avatar"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};