import { useState } from "react";
import { Avatar3D } from "./Avatar3D";

interface AvatarDisplayProps {
  avatarUrl?: string | null;
  size?: "small" | "medium" | "large";
  className?: string;
  onClick?: () => void;
  showStatus?: boolean;
  status?: "online" | "offline" | "away";
}

export const AvatarDisplay = ({ 
  avatarUrl, 
  size = "medium", 
  className = "",
  onClick,
  showStatus = false,
  status = "offline"
}: AvatarDisplayProps) => {
  const [imageError, setImageError] = useState(false);

  const sizeMap = {
    small: { width: 32, height: 32 },
    medium: { width: 48, height: 48 }, 
    large: { width: 80, height: 80 }
  };

  const statusColors = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    away: "bg-yellow-500"
  };

  const { width, height } = sizeMap[size];

  // Check if it's a Ready Player Me GLB model
  const isGlbAvatar = avatarUrl && avatarUrl.includes('readyplayer.me') && avatarUrl.endsWith('.glb');

  // Fallback avatar
  const fallbackAvatar = (
    <div className={`bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center text-white font-bold ${className}`} style={{ width, height }}>
      👤
    </div>
  );

  if (!avatarUrl || imageError) {
    return (
      <div className="relative inline-block">
        {onClick ? (
          <button onClick={onClick} className="block">
            {fallbackAvatar}
          </button>
        ) : (
          fallbackAvatar
        )}
        
        {showStatus && (
          <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${statusColors[status]} rounded-full border-2 border-white`} />
        )}
      </div>
    );
  }

  // If it's a GLB model, use 3D avatar
  if (isGlbAvatar) {
    return (
      <div className="relative inline-block">
        <div 
          className={`rounded-full overflow-hidden ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''} ${className}`}
          onClick={onClick}
          style={{ width, height }}
        >
          <Avatar3D 
            avatarUrl={avatarUrl}
            width={width}
            height={height}
            animate={true}
            showControls={false}
            className="rounded-full"
          />
        </div>
        
        {showStatus && (
          <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${statusColors[status]} rounded-full border-2 border-white`} />
        )}
      </div>
    );
  }

  // Regular image avatar
  return (
    <div className="relative inline-block">
      <img
        src={avatarUrl}
        alt="User Avatar"
        className={`rounded-full object-cover border-2 border-white shadow-lg ${className} ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
        style={{ width, height }}
        onError={() => setImageError(true)}
        onClick={onClick}
      />
      
      {showStatus && (
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${statusColors[status]} rounded-full border-2 border-white`} />
      )}
    </div>
  );
};