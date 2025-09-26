import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    if (user) {
      loadZoneInfo();
      // Refresh zone info every 30 seconds
      const interval = setInterval(loadZoneInfo, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadZoneInfo = async () => {
    if (!user) return;

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
    }
  };

  if (!user || !currentZone) {
    return null;
  }

  const usersInMyZone = nearbyZones.find(zone => zone.zone_key === currentZone);

  return (
    <Card className="fixed bottom-32 right-4 max-w-xs shadow-lg z-20 bg-background/95 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          🌍 Zone Activity
          <Badge variant="secondary" className="text-xs">
            {currentZone}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current Zone */}
        {usersInMyZone && usersInMyZone.user_count > 0 && (
          <div className="border rounded-lg p-2 bg-green-50 dark:bg-green-950">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Your Zone
              </span>
              <Badge variant="default" className="text-xs bg-green-600">
                {usersInMyZone.user_count} 🤝
              </Badge>
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              Can send friend requests to {usersInMyZone.user_count} users
            </div>
          </div>
        )}

        {/* Other Active Zones */}
        {nearbyZones.filter(zone => zone.zone_key !== currentZone).length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Nearby Zones</div>
            {nearbyZones
              .filter(zone => zone.zone_key !== currentZone)
              .slice(0, 3)
              .map((zone) => (
                <div key={zone.zone_key} className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Zone {zone.zone_key}</span>
                  <Badge variant="outline" className="text-xs">
                    {zone.user_count} 👥
                  </Badge>
                </div>
              ))}
          </div>
        )}

        {nearbyZones.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-2">
            No other users nearby
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          💡 Move to zones with users to make friends
        </div>
      </CardContent>
    </Card>
  );
};
