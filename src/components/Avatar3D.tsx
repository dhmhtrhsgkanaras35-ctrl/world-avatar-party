import { useState } from 'react';

interface Avatar3DProps {
  url?: string;
  avatarUrl?: string;
  width?: number;
  height?: number;
  animate?: boolean;
  showControls?: boolean;
  className?: string;
}

export const Avatar3D = ({ 
  url, 
  avatarUrl,
  width = 120, 
  height = 120, 
  animate = false,
  showControls = false,
  className = ""
}: Avatar3DProps) => {
  const [imageError, setImageError] = useState(false);

  // Try to convert .glb URL to .png URL for display
  const getImageUrl = (url: string) => {
    if (url.includes('render.readyplayer.me') && url.includes('.glb')) {
      return url.replace('.glb', '.png') + '?pose=standing&quality=high&transparent=true';
    }
    return url;
  };

  const imageUrl = getImageUrl(avatarUrl || url || '');

  return (
    <div 
      className={`flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {!imageError ? (
        <img
          src={imageUrl}
          alt="Avatar"
          className={`max-w-full max-h-full object-contain ${animate ? 'animate-pulse' : ''}`}
          onError={() => setImageError(true)}
          onLoad={() => setImageError(false)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-600 p-4">
          <div className="w-12 h-12 bg-slate-300 rounded-full mb-2 flex items-center justify-center">
            👤
          </div>
          <div className="text-xs text-center">Avatar</div>
        </div>
      )}
    </div>
  );
};