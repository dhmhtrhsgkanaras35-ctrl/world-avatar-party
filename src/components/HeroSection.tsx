import { Button } from "@/components/ui/button";
import { Avatar } from "./Avatar";
import { EventMarker } from "./EventMarker";
import { useAuth } from "./AuthProvider";
import { useNavigate } from "react-router-dom";
import heroPartyImage from "@/assets/hero-party.jpg";

export const HeroSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroPartyImage}
          alt="WorldMe Party Scene"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/80" />
        <div className="absolute inset-0 gradient-party opacity-30" />
      </div>
      
      {/* Floating elements */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Floating avatars */}
        <div className="absolute top-20 left-10 animate-float">
          <Avatar name="Alex" status="online" animated />
        </div>
        <div className="absolute top-40 right-20 animate-float" style={{ animationDelay: "0.5s" }}>
          <Avatar name="Sam" status="party" animated />
        </div>
        <div className="absolute bottom-40 left-20 animate-float" style={{ animationDelay: "1s" }}>
          <Avatar name="Jordan" status="online" animated />
        </div>
        
        {/* Floating event markers */}
        <div className="absolute top-60 left-1/4 animate-float" style={{ animationDelay: "0.3s" }}>
          <EventMarker 
            type="house-party" 
            title="Beach Party" 
            attendees={12} 
            distance="0.5km" 
          />
        </div>
        <div className="absolute bottom-60 right-1/4 animate-float" style={{ animationDelay: "0.8s" }}>
          <EventMarker 
            type="concert" 
            title="Summer Festival" 
            attendees={150} 
            distance="2.1km" 
          />
        </div>
      </div>
      
      {/* Main content */}
      <div className="relative z-20 text-center max-w-4xl mx-auto px-6">
        <h1 className="text-5xl md:text-7xl font-black text-foreground mb-6 leading-tight">
          Meet Your 
          <span className="gradient-party bg-clip-text text-transparent"> World</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
          Connect with friends through animated avatars, discover epic parties nearby, 
          and create unforgettable memories on the social map.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg" 
            className="text-lg px-8 py-4 party-button gradient-party border-0 shadow-party"
            onClick={() => {
              if (user) {
                // User is already signed in, scroll to map or show features
                document.querySelector('#map-section')?.scrollIntoView({ behavior: 'smooth' });
              } else {
                // Redirect to auth page
                navigate('/auth');
              }
            }}
          >
            {user ? '🗺️ Explore Map' : '🚀 Start Exploring'}
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="text-lg px-8 py-4 party-button border-primary/30 hover:bg-primary/10"
            onClick={() => {
              if (user) {
                // TODO: Navigate to create event page when implemented
                alert("🎉 Event creation coming soon!");
              } else {
                navigate('/auth');
              }
            }}
          >
            🎉 Create Party
          </Button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-16 text-center">
          <div>
            <div className="text-3xl font-bold gradient-party bg-clip-text text-transparent">10K+</div>
            <div className="text-muted-foreground">Active Users</div>
          </div>
          <div>
            <div className="text-3xl font-bold gradient-event bg-clip-text text-transparent">500+</div>
            <div className="text-muted-foreground">Daily Events</div>
          </div>
          <div>
            <div className="text-3xl font-bold gradient-social bg-clip-text text-transparent">50+</div>
            <div className="text-muted-foreground">Cities</div>
          </div>
        </div>
      </div>
    </section>
  );
};