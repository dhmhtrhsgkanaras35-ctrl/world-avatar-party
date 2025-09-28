import { useState, useEffect } from 'react';

interface MapAvatarProps {
  avatarUrl?: string;
  displayName: string;
  size: 'small' | 'large';
  isCurrentUser?: boolean;
  isFriend?: boolean;
}

export const MapAvatar = ({ avatarUrl, displayName, size, isCurrentUser, isFriend }: MapAvatarProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sizeClasses = size === 'large' ? 'w-12 h-12' : 'w-10 h-10';
  const textSize = size === 'large' ? 'text-lg' : 'text-base';
  
  const borderColor = isCurrentUser 
    ? 'border-blue-500 ring-2 ring-blue-200' 
    : isFriend 
    ? 'border-green-500 ring-2 ring-green-200' 
    : 'border-gray-400';

  useEffect(() => {
    if (avatarUrl) {
      setImageLoaded(false);
      setImageError(false);
      
      // Try to load the image with CORS handling
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      
      img.onload = () => {
        setImageLoaded(true);
        setImageError(false);
      };
      
      img.onerror = () => {
        setImageError(true);
        setImageLoaded(false);
        console.warn('Failed to load avatar image:', avatarUrl);
      };
      
      img.src = avatarUrl;
    }
  }, [avatarUrl]);

  const shouldShowImage = avatarUrl && imageLoaded && !imageError;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className={`${sizeClasses} rounded-full border-2 overflow-hidden bg-white shadow-xl flex items-center justify-center transition-transform hover:scale-110 ${borderColor}`}>
      {shouldShowImage ? (
        <img 
          src={avatarUrl} 
          alt={displayName}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className={`${textSize} font-bold text-gray-700`}>
          {initials}
        </div>
      )}
    </div>
  );
};