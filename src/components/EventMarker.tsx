import { cn } from "@/lib/utils";
import housePartyMarker from "@/assets/house-party-marker.jpg";
import concertStageMarker from "@/assets/concert-stage-marker.jpg";

interface EventMarkerProps {
  type: "house-party" | "concert";
  title: string;
  attendees?: number;
  distance?: string;
  animated?: boolean;
  className?: string;
}

export const EventMarker = ({ 
  type, 
  title, 
  attendees = 0, 
  distance, 
  animated = true,
  className 
}: EventMarkerProps) => {
  const isHouseParty = type === "house-party";
  
  return (
    <div className={cn("relative group cursor-pointer", className)}>
      {/* Main marker */}
      <div
        className={cn(
          "relative w-16 h-16 rounded-full overflow-hidden border-2 shadow-event",
          "transform transition-all duration-300 hover:scale-110",
          isHouseParty ? "border-party-pink" : "border-event-purple",
          animated && (isHouseParty ? "party-pulse" : "event-glow")
        )}
      >
        <img
          src={isHouseParty ? housePartyMarker : concertStageMarker}
          alt={`${type} marker`}
          className="w-full h-full object-cover"
        />
        
        {/* Glow overlay */}
        <div
          className={cn(
            "absolute inset-0 rounded-full opacity-50",
            isHouseParty ? "gradient-party" : "gradient-event"
          )}
        />
      </div>
      
      {/* Pulse rings */}
      {animated && (
        <>
          <div
            className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-30",
              isHouseParty ? "bg-party-pink" : "bg-event-purple"
            )}
          />
          <div
            className={cn(
              "absolute -inset-2 rounded-full animate-pulse opacity-20",
              isHouseParty ? "bg-party-pink" : "bg-event-purple"
            )}
          />
        </>
      )}
      
      {/* Info popup on hover */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
        <div className="bg-card border border-border rounded-lg p-3 shadow-party min-w-48">
          <div className="text-sm font-semibold text-foreground mb-1">{title}</div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {attendees > 0 && (
              <span className="flex items-center gap-1">
                👥 {attendees}
              </span>
            )}
            {distance && (
              <span>{distance}</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-accent">
              {isHouseParty ? "🏠 House Party" : "🎤 Concert"}
            </span>
          </div>
        </div>
        {/* Arrow */}
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-card mx-auto"></div>
      </div>
    </div>
  );
};