-- Create event join requests table
CREATE TABLE public.event_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.event_join_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for join requests
CREATE POLICY "Event creators can view join requests for their events"
ON public.event_join_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_join_requests.event_id 
    AND events.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create join requests"
ON public.event_join_requests
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view their own join requests"
ON public.event_join_requests
FOR SELECT
USING (auth.uid() = requester_id);

CREATE POLICY "Event creators can update join requests"
ON public.event_join_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_join_requests.event_id 
    AND events.created_by = auth.uid()
  )
);

-- Create event messages table for chat
CREATE TABLE public.event_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for event messages
CREATE POLICY "Event attendees can view messages"
ON public.event_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM event_attendees 
    WHERE event_attendees.event_id = event_messages.event_id 
    AND event_attendees.user_id = auth.uid()
    AND event_attendees.status = 'going'
  )
);

CREATE POLICY "Event attendees can send messages"
ON public.event_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM event_attendees 
    WHERE event_attendees.event_id = event_messages.event_id 
    AND event_attendees.user_id = auth.uid()
    AND event_attendees.status = 'going'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_event_join_requests_updated_at
BEFORE UPDATE ON public.event_join_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();