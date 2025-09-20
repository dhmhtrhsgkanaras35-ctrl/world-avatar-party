-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create events table for parties and gatherings
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'party',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN NOT NULL DEFAULT true,
  max_attendees INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_locations table for real-time location sharing
CREATE TABLE public.user_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL,
  is_sharing BOOLEAN NOT NULL DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create friendships table for user connections
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Create messages table for chat functionality
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_attendees table for tracking event participation
CREATE TABLE public.event_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for events
CREATE POLICY "Public events are viewable by everyone" 
ON public.events FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create events" 
ON public.events FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own events" 
ON public.events FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own events" 
ON public.events FOR DELETE USING (auth.uid() = created_by);

-- Create RLS policies for user_locations
CREATE POLICY "Users can view friend locations" 
ON public.user_locations FOR SELECT USING (
  user_id = auth.uid() OR 
  (is_sharing = true AND EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE (user_id = auth.uid() AND friend_id = public.user_locations.user_id AND status = 'accepted')
  ))
);

CREATE POLICY "Users can manage their own location" 
ON public.user_locations FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for friendships
CREATE POLICY "Users can view their friendships" 
ON public.friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendship requests" 
ON public.friendships FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships they're part of" 
ON public.friendships FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create RLS policies for messages
CREATE POLICY "Users can view their messages" 
ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" 
ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages" 
ON public.messages FOR UPDATE USING (auth.uid() = recipient_id);

-- Create RLS policies for event_attendees
CREATE POLICY "Event attendees are viewable by event creators and participants" 
ON public.event_attendees FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND created_by = auth.uid())
);

CREATE POLICY "Users can manage their event attendance" 
ON public.event_attendees FOR ALL USING (auth.uid() = user_id);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'display_name'
  );
  RETURN new;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_events_location ON public.events(latitude, longitude);
CREATE INDEX idx_events_created_by ON public.events(created_by);
CREATE INDEX idx_user_locations_user_id ON public.user_locations(user_id);
CREATE INDEX idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX idx_event_attendees_event_id ON public.event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON public.event_attendees(user_id);