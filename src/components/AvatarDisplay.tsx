import { useState } from "react";

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

  // For PNG avatars, show as is with proper aspect ratio
  return (
    <div className="relative inline-block">
      <img
        src={avatarUrl}
        alt="User Avatar"
        className={`object-contain ${className} ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
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