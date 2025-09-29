import { useState } from 'react';

interface MapAvatar3DProps {
  avatarUrl?: string;
  displayName: string;
  isCurrentUser?: boolean;
  isFriend?: boolean;
  size?: 'small' | 'large';
}

export const MapAvatar3D = ({ 
  avatarUrl, 
  displayName, 
  isCurrentUser, 
  isFriend,
  size = 'large'
}: MapAvatar3DProps) => {
  const [imageError, setImageError] = useState(false);

  const containerSize = size === 'large' ? { width: 80, height: 120 } : { width: 64, height: 96 };
  
  const borderColor = isCurrentUser 
    ? 'border-blue-500 ring-2 ring-blue-200' 
    : isFriend 
      ? 'border-green-500 ring-2 ring-green-200' 
      : 'border-gray-300 ring-1 ring-gray-200';

  // Try to convert .glb URL to .png URL for display
  const getImageUrl = (url: string) => {
    if (!url) return null;
    if (url.includes('render.readyplayer.me') && url.includes('.glb')) {
      return url.replace('.glb', '.png') + '?pose=standing&quality=high&transparent=true';
    }
    return url;
  };

  const imageUrl = avatarUrl ? getImageUrl(avatarUrl) : null;

  return (
    <div className="flex flex-col items-center">
      <div 
        className={`relative bg-white rounded-lg border-2 ${borderColor} overflow-hidden shadow-lg hover:scale-105 transition-transform duration-200`}
        style={containerSize}
      >
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={`${displayName}'s avatar`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            onLoad={() => setImageError(false)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <div className="text-4xl">👤</div>
          </div>
        )}
        
        {/* Status indicator */}
        <div className={`absolute top-1 right-1 w-3 h-3 rounded-full ${
          isCurrentUser ? 'bg-blue-500' : isFriend ? 'bg-green-500' : 'bg-gray-400'
        }`}></div>
      </div>
      
      {/* Name label */}
      <div className="mt-1 px-2 py-1 bg-black bg-opacity-75 text-white text-xs rounded max-w-20 truncate">
        {displayName}
      </div>
    </div>
  );
};