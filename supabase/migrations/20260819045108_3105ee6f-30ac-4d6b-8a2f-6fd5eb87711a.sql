CREATE TABLE public.marel_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nueva conversación',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marel_threads TO authenticated;
GRANT ALL ON public.marel_threads TO service_role;
ALTER TABLE public.marel_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marel_threads_owner_all" ON public.marel_threads
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER marel_threads_touch BEFORE UPDATE ON public.marel_threads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX marel_threads_user_idx ON public.marel_threads (user_id, last_message_at DESC);

CREATE TABLE public.marel_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES public.marel_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marel_messages TO authenticated;
GRANT ALL ON public.marel_messages TO service_role;
ALTER TABLE public.marel_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marel_messages_owner_all" ON public.marel_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX marel_messages_thread_idx ON public.marel_messages (thread_id, created_at);

CREATE OR REPLACE FUNCTION public.marel_validate_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role NOT IN ('user','assistant') THEN
    RAISE EXCEPTION 'invalid role: %', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER marel_messages_validate_role BEFORE INSERT OR UPDATE ON public.marel_messages
  FOR EACH ROW EXECUTE FUNCTION public.marel_validate_role();