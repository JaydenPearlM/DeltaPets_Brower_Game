BEGIN;

-- Shared maximum quantity for merchant stock.
CREATE OR REPLACE FUNCTION public.enforce_merchant_stock_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.quantity < 0 OR NEW.quantity > 199 THEN
    RAISE EXCEPTION
      'Merchant stock must be between 0 and 199.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

-- Stop migration if existing Assanti stock exceeds the cap.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.assanti_food_stock
    WHERE quantity > 199
  ) THEN
    RAISE EXCEPTION
      'Existing Assanti stock exceeds 199. Review before applying.';
  END IF;
END;
$$;

-- Connect Assanti's food stock to the shared rule.
CREATE TRIGGER assanti_food_stock_cap
BEFORE INSERT OR UPDATE OF quantity
ON public.assanti_food_stock
FOR EACH ROW
EXECUTE FUNCTION public.enforce_merchant_stock_cap();

COMMIT;