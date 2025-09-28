import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

interface UseNotificationsProps {
  user: User | null;
}

export const useNotifications = ({ user }: UseNotificationsProps) => {
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission;
  };

  // Show browser notification
  const showBrowserNotification = (title: string, body: string, icon?: string) => {
    if (notificationPermission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'worldme-notification'
      });
    }
  };

  // Initialize notifications
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time notifications for user:', user.id);

    // Subscribe to new friend requests
    const friendRequestChannel = supabase
      .channel('friend-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friendships',
          filter: `recipient_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('New friend request received:', payload);
          
          // Get the requester's profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', payload.new.requester_id)
            .single();

          const senderName = profile?.display_name || 'Someone';
          
          // Show toast notification
          toast({
            title: "🤝 New Friend Request",
            description: `${senderName} wants to be your friend!`,
            duration: 5000,
          });

          // Show browser notification
          showBrowserNotification(
            '🤝 New Friend Request',
            `${senderName} wants to be your friend!`,
            profile?.avatar_url
          );
        }
      )
      .subscribe();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('New message received:', payload);
          
          // Get the sender's profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', payload.new.sender_id)
            .single();

          const senderName = profile?.display_name || 'Someone';
          const messagePreview = payload.new.content.length > 50 
            ? payload.new.content.substring(0, 50) + '...'
            : payload.new.content;
          
          // Show toast notification
          toast({
            title: `💬 Message from ${senderName}`,
            description: messagePreview,
            duration: 5000,
          });

          // Show browser notification
          showBrowserNotification(
            `💬 Message from ${senderName}`,
            messagePreview,
            profile?.avatar_url
          );
        }
      )
      .subscribe();

    // Subscribe to friend request responses
    const friendResponseChannel = supabase
      .channel('friend-responses')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',  
          table: 'friendships',
          filter: `requester_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Friend request response:', payload);
          
          if (payload.new.status === 'accepted') {
            // Get the accepter's profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('user_id', payload.new.recipient_id)
              .single();

            const friendName = profile?.display_name || 'Someone';
            
            // Show toast notification
            toast({
              title: "🎉 Friend Request Accepted",
              description: `${friendName} accepted your friend request!`,
              duration: 5000,
            });

            // Show browser notification
            showBrowserNotification(
              '🎉 Friend Request Accepted',
              `${friendName} accepted your friend request!`,
              profile?.avatar_url
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      console.log('Cleaning up notification subscriptions');
      supabase.removeChannel(friendRequestChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(friendResponseChannel);
    };
  }, [user, toast, notificationPermission]);

  return {
    notificationPermission,
    requestNotificationPermission,
    showBrowserNotification
  };
};