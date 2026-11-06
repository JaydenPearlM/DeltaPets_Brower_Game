-- REVIEW ONLY. DO NOT APPLY. No inventory/wallet/profile rows are rewritten.
-- One relic per Kith is the existing chamber slot. Ownership stays in inventory.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE public.pet_relic_equipment (
  pet_id uuid PRIMARY KEY REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.item_defs(id) ON DELETE RESTRICT
);
CREATE INDEX pet_relic_equipment_owner_item ON public.pet_relic_equipment(user_id,item_id);
ALTER TABLE public.pet_relic_equipment ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pet_relic_equipment FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.pet_relic_equipment TO service_role;

CREATE FUNCTION public.get_player_equipment(p_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT jsonb_build_object(
    'wardrobe',coalesce((SELECT jsonb_agg(x.value) FROM public.profiles p,
      jsonb_each_text(coalesce(p.avatar_customization,'{}'::jsonb)) x
      WHERE p.user_id=p_user_id AND x.key IN ('upperBodyClothing','lowerBodyClothing','hat','eyewear')
        AND x.value IS NOT NULL AND x.value<>''),'[]'::jsonb),
    'relics',coalesce((SELECT jsonb_agg(jsonb_build_object('petId',e.pet_id,'slug',d.slug))
      FROM public.pet_relic_equipment e JOIN public.item_defs d ON d.id=e.item_id
      WHERE e.user_id=p_user_id),'[]'::jsonb));
$$;

-- Guard all inventory writers, including future merchant selling, against consuming
-- an equipped copy. Surplus owned copies remain usable/sellable. No qty changes on equip.
CREATE FUNCTION public.guard_equipped_inventory()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_reserved integer; v_slug text;
BEGIN
  -- Preserve FK-triggered deletion cascades without reading restricted auth tables.
  -- Ordinary direct inventory deletes still enforce equipped-copy protection.
  IF TG_OP='DELETE' AND pg_trigger_depth()>1 THEN RETURN OLD; END IF;
  IF TG_OP='UPDATE' AND (NEW.user_id<>OLD.user_id OR NEW.item_id<>OLD.item_id) THEN
    RAISE EXCEPTION 'Inventory ownership keys cannot be changed.';
  END IF;
  SELECT slug INTO v_slug FROM public.item_defs WHERE id=OLD.item_id;
  SELECT count(*) INTO v_reserved FROM public.profiles p,
    jsonb_each_text(coalesce(p.avatar_customization,'{}'::jsonb)) x
    WHERE p.user_id=OLD.user_id AND x.key IN ('upperBodyClothing','lowerBodyClothing','hat','eyewear') AND x.value=v_slug;
  v_reserved := v_reserved + (SELECT count(*) FROM public.pet_relic_equipment WHERE user_id=OLD.user_id AND item_id=OLD.item_id);
  IF (TG_OP='DELETE' AND v_reserved>0) OR (TG_OP='UPDATE' AND NEW.qty<v_reserved) THEN
    RAISE EXCEPTION 'Unequip this item before using or selling its last available copy.';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_equipped_inventory BEFORE UPDATE OR DELETE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.guard_equipped_inventory();

CREATE FUNCTION public.save_owned_appearance(p_user_id uuid,p_appearance jsonb,p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_result jsonb; v_line record; v_owned integer;
BEGIN
  IF p_user_id IS NULL OR jsonb_typeof(p_appearance) IS DISTINCT FROM 'object'
    OR p_target IS NULL OR p_target NOT IN ('current','default') THEN RAISE EXCEPTION 'Invalid appearance.'; END IF;
  PERFORM 1 FROM public.wallets WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  -- Sorted inventory locks serialize equip against every inventory decrement.
  PERFORM 1 FROM public.inventory WHERE user_id=p_user_id ORDER BY item_id FOR UPDATE;
  FOR v_line IN SELECT value AS slug,count(*) AS required FROM jsonb_each_text(p_appearance)
    WHERE key IN ('upperBodyClothing','lowerBodyClothing','hat','eyewear') AND value IS NOT NULL
    GROUP BY value LOOP
    SELECT i.qty INTO v_owned FROM public.inventory i JOIN public.item_defs d ON d.id=i.item_id
      WHERE i.user_id=p_user_id AND d.slug=v_line.slug;
    IF coalesce(v_owned,0)<v_line.required THEN
      RAISE EXCEPTION 'You do not own one or more selected wardrobe items.';
    END IF;
  END LOOP;
  INSERT INTO public.profiles(user_id) VALUES(p_user_id) ON CONFLICT(user_id) DO NOTHING;
  IF p_target='current' THEN
    UPDATE public.profiles SET avatar_customization=p_appearance WHERE user_id=p_user_id;
  ELSE
    UPDATE public.profiles SET default_avatar_customization=p_appearance WHERE user_id=p_user_id;
  END IF;
  SELECT jsonb_build_object('avatar_customization',avatar_customization,
    'default_avatar_customization',default_avatar_customization) INTO v_result FROM public.profiles WHERE user_id=p_user_id;
  RETURN v_result;
END;
$$;

CREATE FUNCTION public.equip_owned_relic(p_user_id uuid,p_pet_id uuid,p_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_item uuid; v_owned integer; v_reserved integer;
BEGIN
  PERFORM 1 FROM public.wallets WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  PERFORM 1 FROM public.pets WHERE id=p_pet_id AND user_id=p_user_id AND stage<>'egg' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'You do not own that Kith.'; END IF;
  IF p_slug IS NULL THEN
    DELETE FROM public.pet_relic_equipment WHERE pet_id=p_pet_id AND user_id=p_user_id;
    RETURN jsonb_build_object('ok',true);
  END IF;
  -- Slug is allowlisted against basic_relics.json by the authenticated backend.
  SELECT id INTO v_item FROM public.item_defs WHERE slug=p_slug AND type='equipment';
  IF NOT FOUND THEN RAISE EXCEPTION 'No unequipped copy of that relic is available.'; END IF;
  SELECT qty INTO v_owned FROM public.inventory WHERE user_id=p_user_id AND item_id=v_item FOR UPDATE;
  SELECT count(*) INTO v_reserved FROM public.pet_relic_equipment WHERE user_id=p_user_id AND item_id=v_item AND pet_id<>p_pet_id;
  IF coalesce(v_owned,0)<=v_reserved THEN RAISE EXCEPTION 'No unequipped copy of that relic is available.'; END IF;
  INSERT INTO public.pet_relic_equipment(pet_id,user_id,item_id) VALUES(p_pet_id,p_user_id,v_item)
    ON CONFLICT(pet_id) DO UPDATE SET item_id=EXCLUDED.item_id;
  RETURN jsonb_build_object('ok',true);
END;
$$;

-- Preserve legacy care exactly; selected-item care uses the same atomic safety checks.
CREATE FUNCTION public.perform_owned_item_care(
  p_user_id uuid, p_pet_id uuid, p_action text, p_expected jsonb, p_patch jsonb, p_slug text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_next public.pets%ROWTYPE;
  v_item_id uuid;
  v_slug text;
  v_category text;
  v_key text;
  v_value jsonb;
  v_cooldown timestamptz;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('clean', 'play')
     OR p_slug IS NULL OR p_expected IS NULL OR p_patch IS NULL THEN
    RAISE EXCEPTION 'Invalid care action.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_pet FROM public.pets
  WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_pet.stage = 'egg' THEN RAISE EXCEPTION 'CARE_NO_PET'; END IF;
  IF v_pet.ran_away THEN RAISE EXCEPTION 'CARE_RUNAWAY'; END IF;

  FOR v_key, v_value IN SELECT * FROM jsonb_each(p_expected) LOOP
    IF v_key IN ('last_care_decay_at', 'runaway_at', 'cd_feed_ends_at',
                 'cd_clean_ends_at', 'cd_play_ends_at', 'cd_bond_ends_at') THEN
      IF ((to_jsonb(v_pet)->>v_key)::timestamptz)
           IS DISTINCT FROM ((p_expected->>v_key)::timestamptz) THEN
        RAISE EXCEPTION 'CARE_STALE';
      END IF;
    ELSIF (to_jsonb(v_pet)->v_key) IS DISTINCT FROM v_value THEN
      RAISE EXCEPTION 'CARE_STALE';
    END IF;
  END LOOP;

  v_cooldown := CASE p_action
    WHEN 'clean' THEN v_pet.cd_clean_ends_at
    WHEN 'play' THEN v_pet.cd_play_ends_at
    WHEN 'bond' THEN v_pet.cd_bond_ends_at ELSE NULL END;
  IF v_cooldown > clock_timestamp() THEN RAISE EXCEPTION 'CARE_COOLDOWN'; END IF;
  v_category := CASE p_action WHEN 'feed' THEN 'food' WHEN 'clean' THEN 'soap'
    WHEN 'play' THEN 'toy' WHEN 'pet' THEN 'bed' ELSE NULL END;
  IF v_category IS NOT NULL THEN
    SELECT i.item_id, d.slug INTO v_item_id, v_slug
    FROM public.inventory i JOIN public.item_defs d ON d.id = i.item_id
    WHERE i.user_id = p_user_id AND i.qty > 0 AND d.type = 'care'
      AND d.slug = p_slug -- Backend allowlists tutorial care and supplies JSON effects.
    ORDER BY d.slug LIMIT 1 FOR UPDATE OF i;
    IF NOT FOUND THEN RAISE EXCEPTION 'CARE_NO_ITEM'; END IF;
    UPDATE public.inventory SET qty = qty - 1, updated_at = now()
    WHERE user_id = p_user_id AND item_id = v_item_id AND qty > 0;
    IF NOT FOUND THEN RAISE EXCEPTION 'CARE_NO_ITEM'; END IF;
  END IF;

  v_next := jsonb_populate_record(v_pet, p_patch);
  UPDATE public.pets SET
    hunger = v_next.hunger, clean = v_next.clean, happy = v_next.happy,
    comfort = v_next.comfort, rest = v_next.rest, energy = v_next.energy,
    bond = v_next.bond, neglect_hours = v_next.neglect_hours,
    ran_away = v_next.ran_away, runaway_at = v_next.runaway_at,
    last_care_decay_at = v_next.last_care_decay_at,
    cd_feed_ends_at = v_next.cd_feed_ends_at, cd_clean_ends_at = v_next.cd_clean_ends_at,
    cd_play_ends_at = v_next.cd_play_ends_at, cd_bond_ends_at = v_next.cd_bond_ends_at
  WHERE id = p_pet_id AND user_id = p_user_id RETURNING * INTO v_next;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARE_NO_PET'; END IF;
  RETURN jsonb_build_object('pet', to_jsonb(v_next), 'consumed_slug', v_slug);
END;
$$;

REVOKE ALL ON FUNCTION public.get_player_equipment(uuid), public.guard_equipped_inventory(),
  public.save_owned_appearance(uuid,jsonb,text), public.equip_owned_relic(uuid,uuid,text),
  public.perform_owned_item_care(uuid,uuid,text,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_equipment(uuid), public.guard_equipped_inventory(),
  public.save_owned_appearance(uuid,jsonb,text), public.equip_owned_relic(uuid,uuid,text),
  public.perform_owned_item_care(uuid,uuid,text,jsonb,jsonb,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
