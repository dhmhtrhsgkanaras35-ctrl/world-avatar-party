import { HeroSection } from "@/components/HeroSection";
import { FeatureCard } from "@/components/FeatureCard";
import { Avatar } from "@/components/Avatar";
import { EventMarker } from "@/components/EventMarker";
import { Button } from "@/components/ui/button";
import avatarsMapImage from "@/assets/avatars-map.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Everything You Need to 
              <span className="gradient-party bg-clip-text text-transparent"> Party</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From customizable avatars to epic event discovery, WorldMe has all the features 
              to make your social life legendary.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="👥"
              title="Social Discovery"
              description="Find friends nearby through animated avatars on the map. Send friend requests, chat, and build your social circle in the real world."
              gradient="social"
            />
            
            <FeatureCard
              icon="🎭"
              title="Custom Avatars"
              description="Create your perfect animated avatar with endless customization options. Express yourself with unique styles, colors, and animations."
              gradient="party"
            />
            
            <FeatureCard
              icon="🎉"
              title="Epic Events"
              description="Discover house parties and concerts nearby. Create your own events with animated markers that light up the map and notify friends."
              gradient="event"
            />
          </div>
        </div>
      </section>
      
      {/* Map Preview Section */}
      <section className="py-24 px-6 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                See Your World 
                <span className="gradient-event bg-clip-text text-transparent">Come Alive</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Watch as your neighborhood transforms into a vibrant social playground. 
                Animated avatars dance across the map, party markers pulse with energy, 
                and new connections spark everywhere you look.
              </p>
              
              {/* Live demo elements */}
              <div className="flex items-center gap-4 mb-6">
                <Avatar name="You" status="online" size="lg" />
                <div className="text-left">
                  <div className="font-semibold text-foreground">That's You! 🌟</div>
                  <div className="text-muted-foreground">Ready to explore your world</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <EventMarker type="house-party" title="Pool Party" attendees={8} />
                  <div className="text-sm">
                    <div className="font-medium">Pool Party</div>
                    <div className="text-muted-foreground">0.3km away</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <EventMarker type="concert" title="Live Music" attendees={45} />
                  <div className="text-sm">
                    <div className="font-medium">Live Music</div>
                    <div className="text-muted-foreground">1.2km away</div>
                  </div>
                </div>
              </div>
              
              <Button 
                size="lg" 
                className="gradient-social party-button border-0 shadow-event"
              >
                🗺️ Explore the Map
              </Button>
            </div>
            
            <div className="relative">
              <img
                src={avatarsMapImage}
                alt="WorldMe Map Interface"
                className="w-full rounded-2xl shadow-party border border-border"
              />
              <div className="absolute inset-0 gradient-party opacity-20 rounded-2xl" />
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Ready to Join the 
            <span className="gradient-party bg-clip-text text-transparent"> Party</span>?
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Download WorldMe and start connecting with your world like never before. 
            Your next adventure is just a tap away.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="text-lg px-12 py-6 gradient-party party-button border-0 shadow-party"
            >
              📱 Download Now
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-12 py-6 party-button"
            >
              🎮 View Demo
            </Button>
          </div>
          
          {/* Social proof */}
          <div className="flex justify-center items-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <span>4.9 Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📱</span>
              <span>iOS & Android</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              <span>Safe & Private</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
