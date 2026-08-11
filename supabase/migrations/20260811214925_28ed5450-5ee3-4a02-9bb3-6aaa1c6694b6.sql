CREATE TABLE IF NOT EXISTS public.notification_settings (
  id integer PRIMARY KEY DEFAULT 1,
  telegram_enabled boolean NOT NULL DEFAULT true,
  telegram_chat_id text,
  email_enabled boolean NOT NULL DEFAULT true,
  notify_emails text[] NOT NULL DEFAULT ARRAY[]::text[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_settings_singleton CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage notification settings" ON public.notification_settings;
CREATE POLICY "Admins manage notification settings"
ON public.notification_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'collaborator'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'collaborator'));

INSERT INTO public.notification_settings (id, notify_emails)
VALUES (1, ARRAY['operaciones@ayoecosystem.com'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'order_notify_secret') THEN
    PERFORM vault.create_secret('dd9d851653938c4238a107f86b17566b39d6e33cd51191b6b5d912fe258f6b2a', 'order_notify_secret');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'no se pudo crear el secreto order_notify_secret: %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION public.orders_notify_new()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'order_notify_secret';

  PERFORM net.http_post(
    url := 'https://project--77c6b513-d8a7-4570-b2ba-3d1a42a2e650.lovable.app/api/public/notifications/order',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', coalesce(v_secret, '')
    ),
    body := jsonb_build_object('orderId', NEW.id)
  );
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'orders_notify_new fallo (pedido conservado): %', SQLERRM;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.orders_notify_new() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orders_notify_new() FROM anon;
REVOKE ALL ON FUNCTION public.orders_notify_new() FROM authenticated;

DROP TRIGGER IF EXISTS orders_notify_new_trg ON public.orders;
CREATE TRIGGER orders_notify_new_trg
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_notify_new();