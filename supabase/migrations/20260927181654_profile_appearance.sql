-- Additive storage only. Existing appearances are unset until players save.
ALTER TABLE public.profiles
  ADD COLUMN avatar_customization jsonb,
  ADD COLUMN default_avatar_customization jsonb,
  ADD CONSTRAINT avatar_customization_object
    CHECK (
      avatar_customization IS NULL
      OR jsonb_typeof(avatar_customization) = 'object'
    ),
  ADD CONSTRAINT default_avatar_customization_object
    CHECK (
      default_avatar_customization IS NULL
      OR jsonb_typeof(default_avatar_customization) = 'object'
    );
