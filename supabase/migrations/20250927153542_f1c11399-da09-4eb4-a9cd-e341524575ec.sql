-- Enable realtime for events table
ALTER TABLE events REPLICA IDENTITY FULL;

-- Add events table to supabase_realtime publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- Enable realtime for event_attendees table  
ALTER TABLE event_attendees REPLICA IDENTITY FULL;

-- Add event_attendees table to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE event_attendees;