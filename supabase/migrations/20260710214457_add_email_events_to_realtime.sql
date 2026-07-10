-- Enable realtime for email_events table so the client can subscribe to INSERT events
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_events;
