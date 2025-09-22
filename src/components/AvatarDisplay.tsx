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

  const sizeClasses = {
    small: "w-8 h-8",
    medium: "w-12 h-12", 
    large: "w-20 h-20"
  };

  const statusColors = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    away: "bg-yellow-500"
  };

  // Fallback avatar
  const fallbackAvatar = (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center text-white font-bold ${className}`}>
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

  return (
    <div className="relative inline-block">
      <img
        src={avatarUrl}
        alt="User Avatar"
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white shadow-lg ${className} ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
        onError={() => setImageError(true)}
        onClick={onClick}
      />
      
      {showStatus && (
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${statusColors[status]} rounded-full border-2 border-white`} />
      )}
    </div>
  );
};