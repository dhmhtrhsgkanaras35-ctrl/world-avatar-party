interface EmojiAvatarProps {
  emoji?: string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: () => void;
}

export const EmojiAvatar = ({ 
  emoji = '🙂', 
  color = '#3B82F6',
  size = 'medium',
  className = '',
  onClick
}: EmojiAvatarProps) => {
  const sizeClasses = {
    small: 'w-8 h-8 text-xl',
    medium: 'w-12 h-12 text-3xl',
    large: 'w-16 h-16 text-4xl'
  };

  return (
    <div 
      className={`flex items-center justify-center rounded-full ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: color }}
      onClick={onClick}
    >
      <span className="select-none">{emoji}</span>
    </div>
  );
};
