import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "./Avatar";
import { EventMarker } from "./EventMarker";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, MapPin, Users } from "lucide-react";

export const MapComponent = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [userLocation, setUserLocation] = useState({ lat: 40.7128, lng: -74.0060 }); // Default to NYC
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 });
  const [zoom, setZoom] = useState(12);

  // Mock nearby users and events
  const nearbyUsers = [
    { id: 1, name: "Alex", lat: 40.7148, lng: -74.0050, status: "online" as const },
    { id: 2, name: "Sam", lat: 40.7108, lng: -74.0070, status: "party" as const },
    { id: 3, name: "Jordan", lat: 40.7138, lng: -74.0040, status: "online" as const },
  ];

  const nearbyEvents = [
    { id: 1, type: "house-party" as const, title: "Beach Vibes Party", lat: 40.7158, lng: -74.0030, attendees: 12 },
    { id: 2, type: "concert" as const, title: "Blue Moon Festival", lat: 40.7098, lng: -74.0080, attendees: 45 },
  ];

  // Request location permission
  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLocation);
          setMapCenter(newLocation);
          alert("📍 Location updated! Real-time tracking needs Supabase integration.");
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("⚠️ Location access denied. Using default location.");
        }
      );
    } else {
      alert("⚠️ Geolocation not supported by this browser.");
    }
  };

  // Map navigation functions
  const moveMap = (direction: "up" | "down" | "left" | "right") => {
    const delta = 0.01;
    setMapCenter(prev => {
      switch (direction) {
        case "up": return { ...prev, lat: prev.lat + delta };
        case "down": return { ...prev, lat: prev.lat - delta };
        case "left": return { ...prev, lng: prev.lng - delta };
        case "right": return { ...prev, lng: prev.lng + delta };
        default: return prev;
      }
    });
  };

  const zoomIn = () => setZoom(prev => Math.min(prev + 1, 20));
  const zoomOut = () => setZoom(prev => Math.max(prev - 1, 1));

  useEffect(() => {
    requestLocation();
  }, []);

  // Calculate positions on the map display
  const getDisplayPosition = (lat: number, lng: number) => {
    const mapWidth = 400;
    const mapHeight = 300;
    
    // Simple projection for demo (not accurate geographically)
    const x = ((lng - (mapCenter.lng - 0.02)) / 0.04) * mapWidth;
    const y = (((mapCenter.lat + 0.015) - lat) / 0.03) * mapHeight;
    
    return { x: Math.max(0, Math.min(x, mapWidth - 20)), y: Math.max(0, Math.min(y, mapHeight - 20)) };
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Map Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={requestLocation}
            className="gradient-social party-button border-0"
            size="sm"
          >
            <MapPin className="w-4 h-4 mr-2" />
            My Location
          </Button>
          <span className="text-sm text-muted-foreground">
            Zoom: {zoom}x
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4" />
          <span>{nearbyUsers.length} nearby</span>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative">
        <div 
          ref={mapRef}
          className="relative w-full h-80 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl border border-border overflow-hidden shadow-party"
          style={{
            background: `
              radial-gradient(circle at 30% 40%, hsl(var(--primary) / 0.1) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, hsl(var(--secondary) / 0.1) 0%, transparent 50%),
              linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--secondary) / 0.05))
            `
          }}
        >
          {/* Grid overlay for map feel */}
          <div className="absolute inset-0 opacity-20">
            <div className="grid grid-cols-8 grid-rows-6 h-full">
              {Array.from({ length: 48 }).map((_, i) => (
                <div key={i} className="border border-primary/10" />
              ))}
            </div>
          </div>

          {/* User location */}
          <div 
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
            style={{
              left: `${getDisplayPosition(userLocation.lat, userLocation.lng).x}px`,
              top: `${getDisplayPosition(userLocation.lat, userLocation.lng).y}px`
            }}
          >
            <div className="relative">
              <Avatar name="You" status="online" size="md" />
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-foreground bg-card px-2 py-1 rounded border whitespace-nowrap">
                You 🌟
              </div>
            </div>
          </div>

          {/* Nearby users */}
          {nearbyUsers.map((user) => (
            <div
              key={user.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: `${getDisplayPosition(user.lat, user.lng).x}px`,
                top: `${getDisplayPosition(user.lat, user.lng).y}px`
              }}
            >
              <Avatar name={user.name} status={user.status} size="sm" />
            </div>
          ))}

          {/* Nearby events */}
          {nearbyEvents.map((event) => (
            <div
              key={event.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-15"
              style={{
                left: `${getDisplayPosition(event.lat, event.lng).x}px`,
                top: `${getDisplayPosition(event.lat, event.lng).y}px`
              }}
            >
              <EventMarker 
                type={event.type}
                title={event.title}
                attendees={event.attendees}
              />
            </div>
          ))}
        </div>

        {/* Navigation Controls */}
        <div className="absolute right-4 top-4 flex flex-col gap-2">
          {/* Directional buttons */}
          <div className="grid grid-cols-3 gap-1">
            <div></div>
            <Button
              size="sm" 
              variant="outline"
              className="w-8 h-8 p-0 party-button"
              onClick={() => moveMap("up")}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <div></div>
            
            <Button
              size="sm" 
              variant="outline"
              className="w-8 h-8 p-0 party-button"
              onClick={() => moveMap("left")}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div></div>
            <Button
              size="sm" 
              variant="outline"
              className="w-8 h-8 p-0 party-button"
              onClick={() => moveMap("right")}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            <div></div>
            <Button
              size="sm" 
              variant="outline"
              className="w-8 h-8 p-0 party-button"
              onClick={() => moveMap("down")}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            <div></div>
          </div>

          {/* Zoom controls */}
          <div className="flex flex-col gap-1 mt-2">
            <Button
              size="sm" 
              variant="outline"
              className="w-8 h-8 p-0 party-button text-xs"
              onClick={zoomIn}
            >
              +
            </Button>
            <Button
              size="sm" 
              variant="outline"
              className="w-8 h-8 p-0 party-button text-xs"
              onClick={zoomOut}
            >
              -
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3">
          <div className="text-xs font-semibold text-foreground mb-2">Legend</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-friend-green"></div>
              <span>Friends Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-party-pink party-pulse"></div>
              <span>At Party</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-event-purple"></div>
              <span>Events</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Info */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        📍 Interactive map preview • Real-time location requires Supabase integration
      </div>
    </div>
  );
};