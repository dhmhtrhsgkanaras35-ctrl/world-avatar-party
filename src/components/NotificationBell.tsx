import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotificationBellProps {
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<NotificationPermission | undefined>;
}

export const NotificationBell = ({ 
  notificationPermission, 
  requestNotificationPermission 
}: NotificationBellProps) => {
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleNotificationToggle = async () => {
    if (notificationPermission === 'granted') {
      toast({
        title: "Notifications Enabled",
        description: "You'll receive notifications for friend requests and messages",
      });
      return;
    }

    if (notificationPermission === 'denied') {
      toast({
        title: "Notifications Blocked",
        description: "To enable: Click the 🔒 icon in your browser's address bar and allow notifications",
        duration: 8000,
      });
      return;
    }

    setIsRequesting(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled! 🔔",
          description: "You'll now receive notifications for friend requests and messages",
        });
      } else {
        toast({
          title: "Notifications Disabled",
          description: "You can enable them later in your browser settings",
          variant: "destructive"
        });
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const getIcon = () => {
    if (notificationPermission === 'granted') {
      return <Bell className="h-4 w-4" />;
    }
    return <BellOff className="h-4 w-4" />;
  };

  const getVariant = () => {
    if (notificationPermission === 'granted') {
      return 'default';
    }
    return 'outline';
  };

  return (
    <Button
      variant={getVariant()}
      size="sm"
      onClick={handleNotificationToggle}
      disabled={isRequesting}
      className="relative"
    >
      {getIcon()}
      {notificationPermission === 'default' && (
        <Badge variant="destructive" className="absolute -top-1 -right-1 w-2 h-2 p-0" />
      )}
    </Button>
  );
};