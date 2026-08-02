ALTER TABLE public.orders ALTER COLUMN impulsador_id DROP NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'impulsador',
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_amount numeric,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_reference_key ON public.orders (payment_reference);

CREATE OR REPLACE FUNCTION public.orders_validate_meta()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.source NOT IN ('impulsador','paid_traffic') THEN
    RAISE EXCEPTION 'invalid source: %', NEW.source;
  END IF;
  IF NEW.payment_method NOT IN ('cod','online') THEN
    RAISE EXCEPTION 'invalid payment_method: %', NEW.payment_method;
  END IF;
  IF NEW.payment_status NOT IN ('pending','paid','failed','voided') THEN
    RAISE EXCEPTION 'invalid payment_status: %', NEW.payment_status;
  END IF;
  IF NEW.source = 'impulsador' AND NEW.impulsador_id IS NULL THEN
    RAISE EXCEPTION 'impulsador orders require impulsador_id';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.orders_validate_meta() FROM PUBLIC;

DROP TRIGGER IF EXISTS orders_validate_meta_trg ON public.orders;
CREATE TRIGGER orders_validate_meta_trg
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_validate_meta();