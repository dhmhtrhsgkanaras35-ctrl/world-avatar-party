import { AvatarConfig } from "./AvatarCustomizer";

interface RealisticAvatarProps {
  config: AvatarConfig;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  name?: string;
  status?: 'online' | 'offline' | 'party';
}

export const RealisticAvatar = ({ 
  config, 
  size = 'medium', 
  animated = false, 
  name,
  status 
}: RealisticAvatarProps) => {
  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16', 
    large: 'w-full h-full'
  };

  const skinTones = [
    '#FDBCB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#654321'
  ];

  const getHairPath = (style: number) => {
    const hairPaths = {
      1: "M50 20 C30 15, 15 25, 15 35 C15 25, 35 15, 50 15 C65 15, 85 25, 85 35 C85 25, 70 15, 50 20Z", // Long flowing
      2: "M50 25 C35 20, 25 25, 25 30 C25 25, 40 20, 50 20 C60 20, 75 25, 75 30 C75 25, 65 20, 50 25Z", // Short neat
      3: "M50 18 C32 12, 18 22, 18 32 C18 28, 25 18, 50 15 C75 18, 82 28, 82 32 C82 22, 68 12, 50 18Z M45 15 C45 12, 48 10, 52 10 C55 10, 58 12, 55 15", // With bangs
      4: "M50 22 C40 18, 30 22, 28 28 C30 24, 40 20, 50 20 C60 20, 70 24, 72 28 C70 22, 60 18, 50 22Z", // Curly short
      5: "M50 20 C35 15, 20 20, 20 30 L22 35 C25 25, 40 18, 50 18 C60 18, 75 25, 78 35 L80 30 C80 20, 65 15, 50 20Z", // Wavy medium
      6: "M50 28 C42 25, 35 28, 35 32 C35 28, 42 25, 50 25 C58 25, 65 28, 65 32 C65 28, 58 25, 50 28Z" // Buzz cut
    };
    return hairPaths[style as keyof typeof hairPaths] || hairPaths[1];
  };

  const getFaceShape = (shape: number, skinTone: string) => {
    const faceShapes = {
      1: `M50 25 C60 25, 70 30, 70 45 C70 55, 65 65, 50 65 C35 65, 30 55, 30 45 C30 30, 40 25, 50 25Z`, // Oval
      2: `M50 25 C62 25, 72 35, 72 45 C72 55, 62 65, 50 65 C38 65, 28 55, 28 45 C28 35, 38 25, 50 25Z`, // Round
      3: `M50 25 C60 25, 68 30, 68 45 C68 55, 60 65, 50 65 C40 65, 32 55, 32 45 C32 30, 40 25, 50 25Z`  // Square
    };
    return faceShapes[shape as keyof typeof faceShapes] || faceShapes[1];
  };

  const getClothing = (style: number, genderType: string) => {
    const clothingStyles = {
      1: genderType === 'female' ? 
         "M30 65 C30 70, 35 75, 50 75 C65 75, 70 70, 70 65 L68 85 C65 88, 55 90, 50 90 C45 90, 35 88, 32 85 Z" : // Dress
         "M32 65 L68 65 L68 85 C65 88, 55 90, 50 90 C45 90, 35 88, 32 85 Z", // T-shirt
      2: "M35 65 L65 65 L65 80 C62 85, 55 88, 50 88 C45 88, 38 85, 35 80 Z M32 75 L35 78 M65 78 L68 75", // Hoodie
      3: "M30 65 L70 65 L70 85 C65 88, 55 90, 50 90 C45 90, 35 88, 30 85 Z M35 70 L65 70", // Button shirt
      4: "M35 65 L65 65 L68 70 L65 85 C60 88, 55 90, 50 90 C45 90, 40 88, 35 85 L32 70 Z", // Tank top
      5: "M32 65 L68 65 L70 75 L65 85 C60 88, 55 90, 50 90 C45 90, 40 88, 35 85 L30 75 Z" // Jacket
    };
    return clothingStyles[style as keyof typeof clothingStyles] || clothingStyles[1];
  };

  const getAccessory = (type: number, genderType: string) => {
    const accessories = {
      1: "M42 38 L48 38 M52 38 L58 38 M40 35 C40 32, 45 30, 50 30 C55 30, 60 32, 60 35", // Glasses
      2: "M50 15 C35 10, 20 15, 20 25 C20 18, 35 12, 50 12 C65 12, 80 18, 80 25 C80 15, 65 10, 50 15Z", // Hat
      3: genderType === 'female' ? "M35 42 C35 40, 37 38, 39 40 M61 40 C63 38, 65 40, 65 42" : "", // Earrings (female only)
      0: "" // None
    };
    return accessories[type as keyof typeof accessories] || "";
  };

  const statusColors = {
    online: '#00ff00',
    offline: '#666666', 
    party: '#ff6b6b'
  };

  const animationClass = animated ? 'animate-pulse' : '';

  return (
    <div className={`${sizeClasses[size]} relative ${animationClass}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ filter: animated ? 'drop-shadow(0 0 10px rgba(66, 153, 225, 0.3))' : undefined }}
      >
        {/* Background Circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="url(#avatarGradient)"
          stroke="#e2e8f0"
          strokeWidth="2"
        />

        {/* Gradient Definition */}
        <defs>
          <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f7fafc" />
            <stop offset="100%" stopColor="#edf2f7" />
          </linearGradient>
        </defs>

        {/* Clothing */}
        <path
          d={getClothing(config.clothing, config.gender)}
          fill="#4299e1"
          stroke="#2b6cb0"
          strokeWidth="1"
        />

        {/* Face Shape */}
        <path
          d={getFaceShape(config.faceShape, skinTones[config.skinTone])}
          fill={skinTones[config.skinTone]}
          stroke="#d69e2e"
          strokeWidth="0.5"
        />

        {/* Eyes */}
        <ellipse cx="42" cy="38" rx="3" ry="2" fill="white" />
        <ellipse cx="58" cy="38" rx="3" ry="2" fill="white" />
        <circle cx="42" cy="38" r="1.5" fill={config.eyeColor} />
        <circle cx="58" cy="38" r="1.5" fill={config.eyeColor} />
        <circle cx="42.5" cy="37.5" r="0.5" fill="white" />
        <circle cx="58.5" cy="37.5" r="0.5" fill="white" />

        {/* Eyebrows */}
        <path d="M38 35 Q42 33 46 35" stroke="#654321" strokeWidth="1" fill="none" />
        <path d="M54 35 Q58 33 62 35" stroke="#654321" strokeWidth="1" fill="none" />

        {/* Nose */}
        <path d="M50 42 L48 46 Q50 47 52 46 Z" fill={skinTones[config.skinTone]} stroke="#d69e2e" strokeWidth="0.3" />

        {/* Mouth */}
        <path 
          d={config.gender === 'female' ? "M46 52 Q50 55 54 52" : "M47 52 Q50 54 53 52"} 
          stroke="#c53030" 
          strokeWidth="1.5" 
          fill="none" 
        />

        {/* Hair */}
        <path
          d={getHairPath(config.hairStyle)}
          fill={config.hairColor}
          stroke="#744210"
          strokeWidth="0.5"
        />

        {/* Accessories */}
        {config.accessory > 0 && (
          <path
            d={getAccessory(config.accessory, config.gender)}
            stroke="#2d3748"
            strokeWidth="1"
            fill="none"
          />
        )}

        {/* Status indicator */}
        {status && (
          <circle
            cx="75"
            cy="75"
            r="8"
            fill={statusColors[status]}
            stroke="white"
            strokeWidth="2"
          />
        )}
      </svg>
      
      {name && size !== 'small' && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-center text-muted-foreground whitespace-nowrap">
          {name}
        </div>
      )}
    </div>
  );
};