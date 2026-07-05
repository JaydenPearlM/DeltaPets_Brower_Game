begin;

-- =========================================================
-- Kithna Deploy Day: Announcements
-- =========================================================

delete from public.announcements
where title in (
  'Deploy Day: Kithna Eggs + Battle Prep',
  'Kithna Journey Systems Are Starting'
);

insert into public.announcements (
  title,
  body,
  is_published,
  page_scope,
  created_at
)
values
(
  'Deploy Day: Kithna Eggs + Battle Prep',
  'Deploys and fixes will be going out throughout the day. Closed alpha testers are welcome to keep testing while updates land. If something looks weird, refresh and report what happened in Discord.',
  true,
  'homepage',
  now()
),
(
  'Kithna Journey Systems Are Starting',
  'Today''s focus is random day and night eggs in Kithna, then random enemy battle setup. This begins the journey where players explore Kithna, discover why enemies are attacking, and learn why eggs sometimes become corrupted.',
  true,
  'homepage',
  now()
);

-- =========================================================
-- Kithna Deploy Day: Alpha Current
-- =========================================================

delete from public.alpha_systems
where title in (
  'Kithna Roaming Eggs',
  'Random Enemy Battle Setup',
  'Aliune Signal Lore Pass'
);

insert into public.alpha_systems (
  title,
  description,
  enabled,
  sort_order,
  released_at
)
values
(
  'Kithna Roaming Eggs',
  'Day eggs and night eggs are being wired into Kithna exploration. These eggs use a non-starter Kithna species pool so starter pets stay separate from wild city discoveries.',
  true,
  0,
  now()
),
(
  'Random Enemy Battle Setup',
  'The next gameplay focus is random enemy encounters and a working battle flow. This will help testers begin fighting enemies that appear around Kithna.',
  true,
  1,
  now()
),
(
  'Aliune Signal Lore Pass',
  'Lore updates are being prepared to explain why enemies are attacking Kithna and why some eggs are affected by corruption during unstable Aliune Signal events.',
  true,
  2,
  now()
);

-- =========================================================
-- Kithna Deploy Day: Patch Notes
-- =========================================================

delete from public.patch_notes
where version = 'v0.0.1-alpha.2';

insert into public.patch_notes (
  version,
  title,
  summary,
  new_notes,
  updated_notes,
  fixed_notes,
  notes,
  is_published,
  released_at
)
values (
  'v0.0.1-alpha.2',
  'Kithna Roam + Battle Prep',
  'Today''s closed alpha deploy pass starts Kithna roaming eggs and prepares the next battle/lore systems.',
  'Kithna day/night roaming egg work started. A separate Kithna non-starter species pool is being used so wild eggs do not mix with starter pets.',
  'Alpha Current and Announcements now explain the active deploy focus: Kithna eggs, random enemy battles, lore, and Aliune Signal cleanup.',
  'Prepared the hatch flow so non-starter Kithna eggs can hatch without being treated like starter eggs.',
  'Deploys may continue throughout the day. Testers should refresh after updates and report bugs with the page, device, and what they were doing.',
  true,
  now()
);

commit;
