import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { getZoneName } from "@/utils/zoneNames";

interface ZoneInfo {
  zone_key: string;
  user_count: number;
  users: Array<{
    user_id: string;
    display_name: string;
    avatar_url: string;
  }>;
}

export const ZoneVisualization = () => {
  const { user } = useAuth();
  const [currentZone, setCurrentZone] = useState<string | null>(null);
  const [nearbyZones, setNearbyZones] = useState<ZoneInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadZoneInfo();
      // Refresh zone info every 15 seconds for more real-time updates
      const interval = setInterval(loadZoneInfo, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadZoneInfo = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get current user's zone
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('zone_key')
        .eq('user_id', user.id)
        .eq('location_sharing_enabled', true)
        .maybeSingle();

      if (userProfile?.zone_key) {
        setCurrentZone(userProfile.zone_key);

        // Get all users in nearby zones (same zone and adjacent zones)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, zone_key')
          .eq('location_sharing_enabled', true)
          .not('zone_key', 'is', null)
          .neq('user_id', user.id);

        if (profiles) {
          // Group users by zone
          const zoneMap: { [key: string]: ZoneInfo } = {};
          
          profiles.forEach(profile => {
            if (!zoneMap[profile.zone_key]) {
              zoneMap[profile.zone_key] = {
                zone_key: profile.zone_key,
                user_count: 0,
                users: []
              };
            }
            zoneMap[profile.zone_key].user_count++;
            zoneMap[profile.zone_key].users.push({
              user_id: profile.user_id,
              display_name: profile.display_name || 'Unknown',
              avatar_url: profile.avatar_url || ''
            });
          });

          // Sort zones by user count and proximity to current zone
          const sortedZones = Object.values(zoneMap)
            .sort((a, b) => {
              // Prioritize current zone, then by user count
              if (a.zone_key === userProfile.zone_key) return -1;
              if (b.zone_key === userProfile.zone_key) return 1;
              return b.user_count - a.user_count;
            })
            .slice(0, 5); // Show top 5 zones

          setNearbyZones(sortedZones);
        }
      }
    } catch (error) {
      console.error('Error loading zone info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !currentZone) {
    return (
      <Card className="fixed bottom-32 right-4 max-w-xs shadow-lg z-20 bg-background/95 backdrop-blur-sm rounded-2xl p-4">
        <CardContent className="space-y-3 p-0">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
              {isLoading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              ) : (
                <span className="text-muted-foreground text-xs">🌍</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {isLoading ? 'Loading zones...' : 'Enable location sharing'}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const usersInMyZone = nearbyZones.find(zone => zone.zone_key === currentZone);

  return (
    <Card className="fixed bottom-32 right-4 max-w-xs shadow-lg z-20 bg-background/95 backdrop-blur-sm rounded-2xl p-4 animate-fade-in">
      <CardContent className="space-y-3 p-0">
        <div className="text-center mb-3">
          <div className="text-sm font-medium text-foreground flex items-center justify-center gap-2">
            🌍 Zone
            <Badge variant="secondary" className="text-xs rounded-full bg-primary/10 text-primary border-primary/20">
              {getZoneName(currentZone)}
            </Badge>
          </div>
        </div>
        
        {/* Current Zone - Enhanced Circular Display */}
        <div className="text-center">
          <div className="relative inline-block">
            <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-gradient-to-br from-primary via-primary-glow to-accent flex items-center justify-center text-white font-bold text-xl shadow-party animate-pulse">
              {usersInMyZone ? usersInMyZone.user_count : 0}
            </div>
            {usersInMyZone && usersInMyZone.user_count > 0 && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                <span className="text-xs text-white">✓</span>
              </div>
            )}
          </div>
          <div className="text-xs font-medium text-primary">
            {usersInMyZone && usersInMyZone.user_count > 0 ? (
              <span className="animate-bounce">🤝 {usersInMyZone.user_count} user{usersInMyZone.user_count > 1 ? 's' : ''} nearby</span>
            ) : (
              <span>👥 Your zone</span>
            )}
          </div>
        </div>

        {/* Other Active Zones - Enhanced indicators */}
        {nearbyZones.filter(zone => zone.zone_key !== currentZone).length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-center text-muted-foreground">Other active zones:</div>
            <div className="flex justify-center gap-2">
              {nearbyZones
                .filter(zone => zone.zone_key !== currentZone)
                .slice(0, 3)
                .map((zone, index) => (
                  <div key={zone.zone_key} className="text-center hover-scale">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-white text-sm font-bold shadow-lg transition-all duration-300 hover:scale-110">
                      {zone.user_count}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 max-w-16 truncate">
                      {getZoneName(zone.zone_key)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {nearbyZones.length === 0 && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center text-muted-foreground text-xs animate-pulse">
              😴
            </div>
            <div className="text-xs text-muted-foreground">
              Zone is quiet right now
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-primary/10">
          💡 Move around to find active zones
        </div>
      </CardContent>
    </Card>
  );
};
