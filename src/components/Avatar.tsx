import { cn } from "@/lib/utils";

interface AvatarProps {
  size?: "sm" | "md" | "lg";
  status?: "online" | "offline" | "party";
  animated?: boolean;
  className?: string;
  name?: string;
}

export const Avatar = ({ 
  size = "md", 
  status = "offline", 
  animated = true, 
  className,
  name = "User"
}: AvatarProps) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16", 
    lg: "w-24 h-24"
  };

  const statusColors = {
    online: "bg-friend-green",
    offline: "bg-muted",
    party: "bg-party-pink party-pulse"
  };

  const avatarColors = [
    "bg-primary",
    "bg-secondary", 
    "bg-party-pink",
    "bg-party-orange",
    "bg-event-purple"
  ];

  // Simple hash to pick consistent color based on name
  const colorIndex = name.length % avatarColors.length;
  const avatarColor = avatarColors[colorIndex];

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center text-foreground font-bold",
          "border-2 border-border shadow-party",
          sizeClasses[size],
          avatarColor,
          animated && "avatar-bounce glow-party"
        )}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      
      {/* Status indicator */}
      <div
        className={cn(
          "absolute -bottom-1 -right-1 rounded-full border-2 border-background",
          "w-4 h-4",
          statusColors[status]
        )}
      />
      
      {/* Party mode indicator */}
      {status === "party" && (
        <div className="absolute -top-2 -right-2 text-party-pink animate-float">
          🎉
        </div>
      )}
    </div>
  );
};