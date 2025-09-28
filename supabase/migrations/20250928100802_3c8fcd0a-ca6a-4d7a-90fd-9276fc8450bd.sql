-- Add is_closed column to events table
ALTER TABLE public.events 
ADD COLUMN is_closed BOOLEAN NOT NULL DEFAULT false;

-- Add closed_at timestamp for when event was closed
ALTER TABLE public.events 
ADD COLUMN closed_at TIMESTAMP WITH TIME ZONE NULL;