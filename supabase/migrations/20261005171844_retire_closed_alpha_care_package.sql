-- Permanently retire the obsolete package. Previously granted rewards and
-- wallet history are intentionally preserved. No cascading deletion is allowed.
BEGIN;

DROP FUNCTION IF EXISTS public.open_closed_alpha_care_package(uuid);

DELETE FROM public.inventory AS owned
USING public.item_defs AS item
WHERE owned.item_id = item.id
  AND item.slug = 'closed-alpha-care-package';

DELETE FROM public.item_defs
WHERE slug = 'closed-alpha-care-package';

COMMIT;
