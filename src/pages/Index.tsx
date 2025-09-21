import { HeroSection } from "@/components/HeroSection";
import { FeatureCard } from "@/components/FeatureCard";
import { MapComponent } from "@/components/MapComponent";
import { LocationToggle } from "@/components/LocationToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";

const Index = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background relative">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Interactive Map Section */}
      <section id="map-section" className="py-24 px-6 bg-muted/10">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Explore Your 
            <span className="gradient-party bg-clip-text text-transparent"> World</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            See friends and events around you in real-time. Navigate with directional controls 
            and discover what's happening nearby.
          </p>
          
          <MapComponent />
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Everything You Need to 
              <span className="gradient-party bg-clip-text text-transparent"> Connect</span>
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
      
      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Ready to Join the 
            <span className="gradient-party bg-clip-text text-transparent"> Network</span>?
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Connect to Supabase to enable real-time location, friend requests, 
            messaging, and live event creation.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="text-lg px-12 py-6 gradient-party party-button border-0 shadow-party"
              onClick={() => {
                alert("🔗 Connect Supabase first to enable all features!");
              }}
            >
              📱 Enable Real-Time
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-12 py-6 party-button"
              onClick={() => {
                alert("🗺️ Map demo active! Full features need Supabase integration.");
              }}
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

      {/* Location Toggle Component */}
      <LocationToggle user={user} />

      {/* User Menu */}
      {user && (
        <div className="fixed top-6 right-6 z-50">
          <div className="flex items-center gap-3 bg-card p-3 rounded-lg shadow-lg border">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.user_metadata?.display_name || user.email}!
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => signOut()}
            >
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
