BEGIN;

CREATE TABLE public.pet_element_deltas (
  pet_id uuid NOT NULL,

  null_element integer NOT NULL DEFAULT 0 CHECK (null_element >= 0),
  water integer NOT NULL DEFAULT 0 CHECK (water >= 0),
  fire integer NOT NULL DEFAULT 0 CHECK (fire >= 0),
  earth integer NOT NULL DEFAULT 0 CHECK (earth >= 0),
  air integer NOT NULL DEFAULT 0 CHECK (air >= 0),
  ice integer NOT NULL DEFAULT 0 CHECK (ice >= 0),
  storm integer NOT NULL DEFAULT 0 CHECK (storm >= 0),
  light integer NOT NULL DEFAULT 0 CHECK (light >= 0),
  shadow integer NOT NULL DEFAULT 0 CHECK (shadow >= 0),

  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pet_element_deltas_pkey
    PRIMARY KEY (pet_id),

  CONSTRAINT pet_element_deltas_pet_id_fkey
    FOREIGN KEY (pet_id)
    REFERENCES public.pets(id)
    ON DELETE CASCADE
);

COMMENT ON TABLE public.pet_element_deltas IS
  'Per-Kith collected elemental Delta objects. Separate from Gym-trained pet_elements.';

ALTER TABLE public.pet_element_deltas ENABLE ROW LEVEL SECURITY;

CREATE POLICY pet_element_deltas_select_own
ON public.pet_element_deltas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pets
    WHERE pets.id = pet_element_deltas.pet_id
      AND pets.user_id = auth.uid()
  )
);

REVOKE INSERT, UPDATE, DELETE
ON public.pet_element_deltas
FROM anon, authenticated;

GRANT SELECT
ON public.pet_element_deltas
TO authenticated;

CREATE OR REPLACE FUNCTION public.award_pet_element_delta(
  p_user_id uuid,
  p_pet_id uuid,
  p_element text,
  p_quantity integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_elements public.pet_elements%ROWTYPE;
  v_current integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Delta quantity must be positive.'
    );
  END IF;

  SELECT *
  INTO v_pet
  FROM public.pets
  WHERE id = p_pet_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kith not found.'
    );
  END IF;

  IF v_pet.stage::text = 'egg' OR v_pet.ran_away THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This Kith cannot receive a Delta.'
    );
  END IF;

  SELECT *
  INTO v_elements
  FROM public.pet_elements
  WHERE pet_id = p_pet_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This Kith has no elemental stats.'
    );
  END IF;

  /*
   * A Delta only stays if the Kith has already developed
   * that element through its natural element or future Gym training.
   */
  IF
    CASE p_element
      WHEN 'null_element' THEN v_elements.null_element
      WHEN 'voidborne' THEN v_elements.null_element
      WHEN 'null' THEN v_elements.null_element
      WHEN 'water' THEN v_elements.water
      WHEN 'fire' THEN v_elements.fire
      WHEN 'earth' THEN v_elements.earth
      WHEN 'air' THEN v_elements.air
      WHEN 'ice' THEN v_elements.ice
      WHEN 'storm' THEN v_elements.storm
      WHEN 'light' THEN v_elements.light
      WHEN 'shadow' THEN v_elements.shadow
      ELSE 0
    END <= 0
  THEN
    RETURN jsonb_build_object(
      'success', true,
      'absorbed', false,
      'reason', 'element_not_known',
      'element', p_element
    );
  END IF;

  INSERT INTO public.pet_element_deltas (pet_id)
  VALUES (p_pet_id)
  ON CONFLICT (pet_id) DO NOTHING;

  CASE p_element
    WHEN 'null_element', 'voidborne', 'null' THEN
      UPDATE public.pet_element_deltas
      SET
        null_element = null_element + p_quantity,
        updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING null_element INTO v_current;

    WHEN 'water' THEN
      UPDATE public.pet_element_deltas
      SET water = water + p_quantity, updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING water INTO v_current;

    WHEN 'fire' THEN
      UPDATE public.pet_element_deltas
      SET fire = fire + p_quantity, updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING fire INTO v_current;

    WHEN 'earth' THEN
      UPDATE public.pet_element_deltas
      SET earth = earth + p_quantity, updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING earth INTO v_current;

    WHEN 'air' THEN
      UPDATE public.pet_element_deltas
      SET air = air + p_quantity, updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING air INTO v_current;

    WHEN 'ice' THEN
      UPDATE public.pet_element_deltas
      SET ice = ice + p_quantity, updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING ice INTO v_current;

    WHEN 'storm' THEN
      UPDATE public.pet_element_deltas
      SET storm = storm + p_quantity, updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING storm INTO v_current;

    WHEN 'light' THEN
      UPDATE public.pet_element_deltas
      SET light = light + p_quantity, updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING light INTO v_current;

    WHEN 'shadow' THEN
      UPDATE public.pet_element_deltas
      SET shadow = shadow + p_quantity, updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING shadow INTO v_current;

    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Unsupported Delta element.'
      );
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'absorbed', true,
    'element', p_element,
    'quantity', p_quantity,
    'total', v_current
  );
END;
$$;

REVOKE ALL
ON FUNCTION public.award_pet_element_delta(uuid, uuid, text, integer)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.award_pet_element_delta(uuid, uuid, text, integer)
TO service_role;

COMMIT;