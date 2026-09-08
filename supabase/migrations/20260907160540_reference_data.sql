SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict risWNvg6H0p69jxGcm14kCpboVahkXFSszWQFv4gHORw9uwIemgUxdeOpNQgghS

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: alpha_systems; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."alpha_systems" ("id", "title", "description", "enabled", "sort_order", "created_at", "released_at") VALUES
	('3402499f-aff4-4363-b196-563d1c6c6b48', 'Aliune Signal Active!', 'The Aliune Signal is now active on the homepage, giving players a live look at world stability, regional conditions, and corruption levels across Aliune. This system will continue to grow as world events and environmental changes are introduced.  (The current info on the Aliune Signal is fallback data)', false, 1, '2026-04-12 18:37:43.855867+00', '2026-04-12 18:37:33+00'),
	('e1784bce-51f6-4700-a66d-d2410d24a008', 'Welcome to the Closed Alpha!', 'The Aliune Signal is live.

DeltaPets is entering Closed Alpha testing and this version is not finished yet, but the main testing flow is ready enough for the Closed Alpha Team to start breaking things in a useful way.

Please test the core player journey:

* Create an account
* Start the intro flow
* Receive and hatch your first egg
* View your pet
* Use care actions
* Check your party/team display
* Open skills, inventory, and related panels
* Report any visual bugs, broken buttons, missing data, or confusing screens

This alpha build is focused on stability, usability, and catching bugs before wider testing. Some content, balance, art, and polish are still placeholder or unfinished.

If something breaks, please submit a bug ticket with a screenshot and a short explanation of what happened.

Happy hunting, Alpha Team.
', false, 0, '2026-07-02 16:02:56+00', '2026-07-02 16:04:54+00'),
	('f551c8a0-303c-41f9-9476-daf9172f98c0', 'Homepage is complete!', 'I had some redesign on the Homepage that took a month to fix. I like the outcome a lot better than my previous version of Deltapets', false, 0, '2026-04-04 16:11:16+00', '2026-04-04 16:12:00+00'),
	('57426b55-f02c-4c00-a834-c91f30e21e56', 'Mobile Setup Pass', 'DeltaPets is currently focused on mobile layout improvements. The homepage, navigation, popups, panels, buttons, and core testing flow are being checked so alpha testers can use the game more comfortably on phones and smaller screens.', true, 0, '2026-07-03 13:57:13.842151+00', '2026-07-03 12:00:00+00'),
	('47a36c82-1893-4e61-94e5-78d31dc72be2', 'Closed Alpha Testing', 'Closed Alpha testing is active. Please continue testing the main player journey: create an account, start the intro flow, receive and hatch your first egg, view your pet, use care actions, check your party/team display, and open skills, inventory, armory, and related panels.', true, 1, '2026-07-03 13:57:13.842151+00', '2026-07-03 12:00:00+00'),
	('51ff5dcd-1088-4cda-bf40-3d4bbbbd6a62', 'Homepage Stability', 'The homepage is being updated to better show announcements, patch notes, current alpha status, version information, and warning banners. Some visual polish is still in progress, but stability and usability come first.', true, 2, '2026-07-03 13:57:13.842151+00', '2026-07-03 12:00:00+00'),
	('bc4ccc42-399f-4341-be97-25f76e6e00b2', 'Kithna Roaming Eggs', 'Day eggs and night eggs are being wired into Kithna exploration. These eggs use a non-starter Kithna species pool so starter pets stay separate from wild city discoveries.', true, 0, '2026-07-05 18:38:12.579054+00', '2026-07-05 18:38:12.579054+00'),
	('fd21110b-a95c-4c0e-8592-cb62dcd90b72', 'Random Enemy Battle Setup', 'The next gameplay focus is random enemy encounters and a working battle flow. This will help testers begin fighting enemies that appear around Kithna.', true, 1, '2026-07-05 18:38:12.579054+00', '2026-07-05 18:38:12.579054+00'),
	('aab5e7b6-4d4d-4b7b-8e53-50dce1ed7feb', 'Aliune Signal Lore Pass', 'Lore updates are being prepared to explain why enemies are attacking Kithna and why some eggs are affected by corruption during unstable Aliune Signal events.', true, 2, '2026-07-05 18:38:12.579054+00', '2026-07-05 18:38:12.579054+00'),
	('f7ec6025-9cf4-42b0-abc5-b799886ef0a4', 'Food Merchant - Kithna', 'Care items available for purchase using Dots. Trough upgrades unlocked. Visit Kithna to access.', true, 0, '2026-07-21 13:58:43.193521+00', '2026-07-21 00:00:00+00'),
	('d324354c-40bc-481f-b3ad-1eb917a1a189', 'Kithna Roam Encounters', 'Random day and night egg encounters are live in Kithna. Wild eggs use a separate species pool from starters.', true, 0, '2026-07-21 13:58:43.193521+00', '2026-07-05 00:00:00+00'),
	('e457ad97-7a53-4c22-b256-c604c1c72a28', 'Kith Team Party System', 'Up to 4 pets in your active team. Hatchlings automatically fill the next open slot. Full party sends new pets to storage.', true, 0, '2026-07-21 13:58:43.193521+00', '2026-07-01 00:00:00+00'),
	('19b4dd9d-8168-4d60-a5b3-c68eb5039e92', 'Care Loop', 'Feed, clean, play, and comfort your Delta daily. Care stats decay over time. Bond grows with consistent care.', true, 0, '2026-07-21 13:58:43.193521+00', '2026-06-15 00:00:00+00'),
	('7ad3e220-72be-40f8-9552-11b723806e52', 'Egg Hatching', 'Starter eggs and Kithna eggs can be incubated and hatched. Stats, personality, and traits are rolled at hatch.', true, 0, '2026-07-21 13:58:43.193521+00', '2026-06-01 00:00:00+00');


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."announcements" ("id", "title", "body", "is_published", "created_at", "updated_at", "created_by", "page_scope") VALUES
	('43e8d20d-1186-4e0b-b87c-566e716553ea', 'Homepage is getting a glow up!', 'I am taking a look back at my Homepage and creating something that looks nice and works great. With nice code.', true, '2026-03-25 17:33:25.75859+00', '2026-03-25 17:33:25.75859+00', NULL, 'homepage'),
	('7bf42d4c-e5a1-432b-a320-0bbbcc13c5df', 'Good Morning', 'Hello Deltapets!  
I have made a lot of progress and updates to my web apps home page!  Look around, and make sure to upload any bugs or problem with speed!  Thank you/1', true, '2026-04-04 14:02:51+00', '2026-04-04 14:03:00.46873+00', NULL, 'homepage'),
	('abcc4b01-091a-428e-b69f-7de9fdccf63d', 'Good Morning, Users!', 'Welcome to Aliune.

The world has been quieter than usual… but not for long.

Recent system updates have improved how information travels across regions, and the Signal is becoming clearer with each passing cycle. You may begin to notice changes....not everything is as stable as it seems.

Keep an eye on your surroundings, and report anything unusual.

This is only the beginning.', true, '2026-04-12 18:33:34+00', '2026-04-12 18:33:44.273576+00', NULL, 'homepage'),
	('52138ec5-0578-469a-b924-e579ffe23778', 'WELCOME TO THE CLOSE ALPHA!', 'The Aliune Signal is live.

DeltaPets is entering Closed Alpha testing this week. This version is not finished yet, but the main testing flow is ready enough for the Closed Alpha Team to start testing.

Please test the core player journey:

Create an account.
Start the intro flow.
Receive and hatch your first egg.
View your pet.
Use care actions.
Check your party/team display.
Open skills, inventory, armory, and related panels.
Report any visual bugs, broken buttons, missing data, or confusing screens.

This alpha build is focused on stability, usability, and catching bugs before wider testing. Some content, balance, art, and polish are still placeholder or unfinished.

If something breaks, please submit a bug ticket with a screenshot and a short explanation of what happened.

Happy hunting, Alpha Team.', true, '2026-07-02 16:06:35+00', '2026-07-02 16:09:32.700039+00', NULL, 'homepage'),
	('924feb01-4510-4791-b5c4-44e16fb95115', 'MOBILE SETUP PASS HAS STARTED!', 'DeltaPets is now in the Mobile Setup Pass for Closed Alpha. The main goal right now is making the homepage, menus, popups, panels, buttons, and core player flow work better on smaller screens. Please test the site on mobile and desktop if you can. Focus on signup, login, intro flow, hatching your first egg, viewing your pet, using care actions, opening panels, and checking that buttons are easy to tap. If something breaks, overlaps, disappears, or looks suspicious, please submit a bug ticket with a screenshot and a short explanation. Happy testing, Alpha Team.', true, '2026-07-03 13:42:01+00', '2026-07-03 14:29:02.480447+00', NULL, 'homepage'),
	('c9b90d31-2add-4d6e-b15e-2613040073f9', 'Deploy Day: Kithna Eggs + Battle Prep', 'Deploys and fixes will be going out throughout the day. Closed alpha testers are welcome to keep testing while updates land. If something looks weird, refresh and report what happened in Discord.', true, '2026-07-05 18:38:12.579054+00', '2026-07-05 18:38:12.579054+00', NULL, 'homepage'),
	('1d2d4469-0543-4b80-99d2-d15ad2969ca6', 'Kithna Journey Systems Are Starting', 'Today''s focus is random day and night eggs in Kithna, then random enemy battle setup. This begins the journey where players explore Kithna, discover why enemies are attacking, and learn why eggs sometimes become corrupted.', true, '2026-07-05 18:38:12.579054+00', '2026-07-05 18:38:12.579054+00', NULL, 'homepage'),
	('02519530-e3d7-47f1-a084-10ec8ee09362', 'Kithna Journey Systems Are Starting', 'Today''s closed alpha deploy starts Kithna roaming eggs and prepares the next battle and lore systems. A separate Kithna non-starter species pool is being used so wild eggs do not mix with starter pets.', true, '2026-07-05 12:00:00+00', '2026-07-21 13:58:24.653691+00', NULL, 'homepage'),
	('c9cee5e8-011a-4e4c-99a9-688992378b18', 'What to Look Forward to on August 1', 'The next major deploy targets August 1. Planned for launch: the full battle dungeon loop, pet self-awareness conversations, evolution stage one for closed alpha pets, and the Bond system going live. Testers who are active now will have a head start.', true, '2026-07-21 12:00:00+00', '2026-07-21 13:58:24.653691+00', NULL, 'homepage'),
	('679180ab-752d-4ec1-bd67-db65d86c781b', 'Closed Alpha Progress Report', 'Since launch: egg hatching is live, Kithna roam encounters are working, the Food Merchant is open, care loops are stable, and the Kith Team party system is being hardened. Bug reports from testers have been critical. Thank you for staying in.', true, '2026-07-18 12:00:00+00', '2026-07-21 13:58:24.653691+00', NULL, 'homepage'),
	('b1944adc-0247-4f8f-8884-acb4f589b684', 'Mobile Setup Pass Has Started', 'The layout team is actively working through mobile screen fixes. Panels, popups, buttons, and small screen layouts may shift during testing. Report anything that looks broken.', true, '2026-07-03 12:00:00+00', '2026-07-21 13:58:24.653691+00', NULL, 'homepage');


--
-- Data for Name: awards; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."awards" ("id", "key", "name", "type", "icon_url", "rarity", "description", "created_at") VALUES
	('5b013d26-680b-4d5c-8a22-0138b58e9cc7', 'alpha_tester', 'Alpha Tester', 'ribbon', NULL, 'special', 'Awarded for participating in the Alpha deployment testing.', '2026-02-12 14:16:06.366851+00');


--
-- Data for Name: element_defs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."element_defs" ("id", "key", "display_name", "sort_order", "created_at") VALUES
	('5ebe8f00-0f15-4cf2-9ff5-bdf20e22bd3a', 'null', 'Null', 0, '2026-01-22 18:05:11.100664+00'),
	('2d5592a8-e636-43f3-8108-4972046464f0', 'water', 'Water', 1, '2026-01-22 18:05:11.100664+00'),
	('5d0cdd94-d38c-46df-9901-a20cf1f6b2df', 'fire', 'Fire', 2, '2026-01-22 18:05:11.100664+00'),
	('8ca03d5d-1157-4a75-b067-7a1eaa3a0712', 'earth', 'Earth', 3, '2026-01-22 18:05:11.100664+00'),
	('d3ba1a77-feed-40f7-9a7d-aa379f4cefc0', 'air', 'Air', 4, '2026-01-22 18:05:11.100664+00'),
	('78542868-889f-4e6c-8a61-237062f43a76', 'ice', 'Ice', 5, '2026-01-22 18:05:11.100664+00'),
	('3b6d6d3c-8abd-4993-b024-2847e44fd924', 'storm', 'Storm', 6, '2026-01-22 18:05:11.100664+00'),
	('0512f58a-c239-4301-ac16-eeb7b2e22499', 'light', 'Light', 7, '2026-01-22 18:05:11.100664+00'),
	('b39a05e4-88d0-4cb7-a925-b2223d3ee974', 'shadow', 'Shadow', 8, '2026-01-22 18:05:11.100664+00');


--
-- Data for Name: game_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."game_config" ("key", "value") VALUES
	('stat_rules', '{"max_level": 100, "base_total": 10, "points_per_level": 1}');


--
-- Data for Name: homepage_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."homepage_alerts" ("id", "message", "alert_color", "alert_type", "is_active", "starts_at", "ends_at", "cta_label", "cta_href", "created_at", "updated_at") VALUES
	('1dbaec9c-7737-40cc-b5f2-365499c4da1c', '"Hello Users! It''s a beautiful Day in the world of Aliune.  Just one cautious thing Id like to mention... dont go swimming in the fountain today, some votlet decided it top be there bath.  It''s very electrifying, dont go in until they leave." - Jay', 'green', 'news', false, NULL, NULL, NULL, NULL, '2026-04-06 01:54:51+00', '2026-07-03 14:29:02.480447+00'),
	('c35ea315-0df2-4e36-aa3d-c3c1c8d8c854', 'Caution: Luna found the mobile menu and pressed every button at once. Nothing is on fire, but the layout team is watching her closely. || Mobile Setup Pass is active. Panels, popups, buttons, and tiny-screen layouts may be a little wiggly while testing continues.', 'yellow', 'funny', false, '2026-07-03 00:00:00+00', NULL, NULL, NULL, '2026-07-03 14:29:02.480447+00', '2026-07-30 20:49:33.462481+00'),
	('ddcd992f-fa4d-4c13-aeef-dddaf0df4548', 'The Food Merchant is now open in Kithna. Stock up on care items for your Delta. || Fresh supply available daily. Visit the Food Merchant to feed and care for your team. || Kithna Market is active. Trough capacity upgrades now available. || Your Delta needs you. Care items are waiting at the Kithna Food Merchant.', 'green', 'market', false, NULL, NULL, 'Visit Kithna', '/cities/kithna', '2026-07-21 13:55:13.690189+00', '2026-07-30 20:49:33.462481+00'),
	('2bea0172-44bf-4c06-8149-f11b8d782fad', 'The Food Merchant is now open in Kithna. Stock up on care items for your Delta. || Fresh supply available daily. Visit the Food Merchant to feed and care for your team. || Kithna Market is active. Trough capacity upgrades now available. || Your Delta needs you. Care items are waiting at the Kithna Food Merchant.', 'green', 'market', false, NULL, NULL, 'Visit Kithna', '/cities/kithna', '2026-07-21 13:56:15.43811+00', '2026-07-30 20:49:33.462481+00'),
	('12b38782-60ac-4ce1-bf7b-4642e88a0b17', 'The Food Merchant is now open in Kithna. Stock up on care items for your Delta. || Visit the Food Merchant in Kithna to keep your Delta fed and happy. || The Food Merchant has everything your Delta needs. Come find it in Kithna.', 'green', 'market', false, NULL, NULL, 'Visit Kithna', '/cities/kithna', '2026-07-21 13:58:05.012697+00', '2026-07-30 20:49:33.462481+00'),
	('785b972c-8393-4333-a38c-76121d21106b', 'Assanti has opened his doors in Kithna! Visit Kithna''s first merchant and see what''s in stock.', 'green', 'market', true, '2026-07-30 20:49:33.462481+00', NULL, NULL, NULL, '2026-07-30 20:49:33.462481+00', '2026-07-30 20:49:33.462481+00');


--
-- Data for Name: item_defs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."item_defs" ("id", "slug", "name", "type", "description", "rarity", "stack_limit", "effects", "created_at", "updated_at") VALUES
	('c6cf0952-06e6-4a0c-8909-6ebefa221d02', 'starter_equipment', 'Starter Equipment', 'equipment', 'A basic equipment bundle awarded from the weekly reward track.', 2, 99, '{}', '2026-07-10 14:57:12.094886+00', '2026-07-11 12:38:14.320661+00'),
	('101a0357-8203-4a8a-b79b-77ae70b01d6b', 'potion_small', 'Small Potion', 'battle_food', 'A small restorative potion awarded from the weekly reward track.', 1, 99, '{}', '2026-07-10 14:57:12.094886+00', '2026-07-11 12:38:14.320661+00'),
	('f574dfa2-9db9-4f7f-8f8b-e2a85f114b02', 'kithna-food-pack', 'Kithna Food Pack', 'care', 'A simple meal for restoring hunger.', 1, 99, '{"careCategory": "food"}', '2026-07-10 14:57:12.094886+00', '2026-07-11 12:38:14.320661+00'),
	('b64cb741-a6f5-4229-b2d2-b34e26ef64e8', 'soft-cleaning-brush', 'Soft Cleaning Brush', 'care', 'A gentle brush for restoring clean.', 1, 99, '{"careCategory": "soap"}', '2026-07-10 14:57:12.094886+00', '2026-07-11 12:38:14.320661+00'),
	('7691a9ee-46ed-4378-9c91-06db493e0466', 'spark-jingle-toy', 'Spark Jingle Toy', 'care', 'A tiny toy for restoring mood.', 1, 99, '{"careCategory": "toy"}', '2026-07-10 14:57:12.094886+00', '2026-07-11 12:38:14.320661+00'),
	('b9f5e14f-9f81-4547-8de3-b7b92d0b690e', 'moon-nap-pillow', 'Moon Nap Pillow', 'care', 'A soft pillow for restoring comfort.', 1, 99, '{"careCategory": "bed"}', '2026-07-10 14:57:12.094886+00', '2026-07-11 12:38:14.320661+00'),
	('b311f35e-b2c0-4449-a528-e4fb5d157cc8', 'closed-alpha-care-package', 'Closed Alpha Care Package', 'care', 'A thank-you package for DeltaPets alpha testers.', 3, 1, '{"rewardKind": "care_package"}', '2026-07-25 14:50:57.029856+00', '2026-07-27 16:03:56.768325+00'),
	('068994cf-e20a-41b1-8db4-08487d111f25', 'potato', 'Potato', 'care', 'Just a potato.', 1, 1, '{}', '2026-08-08 17:02:51.052316+00', '2026-08-08 17:02:51.052316+00'),
	('6da47ca6-fa2a-4774-83a4-8e159aa32913', 'haiku_scroll_50', 'Haiku Scroll #50', 'material', 'A tiny ribbon-bound scroll containing a piece of Aliune lore.', 2, 99, '{"haiku": ["Twin moons cross the mist", "Old roads hum beneath starlight", "Aliune listens"], "collection": "haiku", "scrollNumber": 50}', '2026-08-13 17:01:51.109701+00', '2026-08-14 14:52:58.123756+00'),
	('b6ad229e-8748-41aa-b1d6-3965aa9d0086', 'water-delta', 'Water Delta', 'material', 'A Delta symbol infused with Water energy. Used for Water evolution.', 1, 999, '{"element": "water"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00'),
	('6857bf8f-bce7-400b-86bd-249f4a1bb81f', 'fire-delta', 'Fire Delta', 'material', 'A Delta symbol infused with Fire energy. Used for Fire evolution.', 1, 999, '{"element": "fire"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00'),
	('c0673429-423b-4c4f-a8d6-58df86a11a02', 'earth-delta', 'Earth Delta', 'material', 'A Delta symbol infused with Earth energy. Used for Earth evolution.', 1, 999, '{"element": "earth"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00'),
	('1e93f485-236e-4e44-80c6-0212e7b5c3a4', 'air-delta', 'Air Delta', 'material', 'A Delta symbol infused with Air energy. Used for Air evolution.', 1, 999, '{"element": "air"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00'),
	('0eb85ccc-17f3-434f-9306-bae62c7276ca', 'ice-delta', 'Ice Delta', 'material', 'A Delta symbol infused with Ice energy. Used for Ice evolution.', 1, 999, '{"element": "ice"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00'),
	('c324521e-fb92-4925-a167-f92a8f01322f', 'storm-delta', 'Storm Delta', 'material', 'A Delta symbol infused with Storm energy. Used for Storm evolution.', 1, 999, '{"element": "storm"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00'),
	('caab1ab8-9831-4785-af3d-bf82f5298b9d', 'light-delta', 'Light Delta', 'material', 'A Delta symbol infused with Light energy. Used for Light evolution.', 1, 999, '{"element": "light"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00'),
	('b9b1de53-c72c-4c3d-ab95-42e4e118c49b', 'shadow-delta', 'Shadow Delta', 'material', 'A Delta symbol infused with Shadow energy. Used for Shadow evolution.', 1, 999, '{"element": "shadow"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00');


--
-- Data for Name: mutations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."mutations" ("id", "key", "name", "rarity", "description", "effect_summary", "drawback_summary", "effects", "is_active", "created_at") VALUES
	('555c2363-19d2-4f29-b0c5-f7a7ea757c04', 'sturdy_frame', 'Sturdy Frame', 'common', 'This Kith developed a broader frame and greater natural endurance.', '+5% maximum HP', '-3% Speed', '{"stat_percent": {"spd": -3, "hp_max": 5}}', true, '2026-06-19 14:41:21.698314+00'),
	('7a6b00f3-a905-4f1d-a441-b3fa4ece3005', 'light_bones', 'Light Bones', 'common', 'A lighter skeletal structure lets this Kith move more quickly.', '+5% Speed', '-3% Defense', '{"stat_percent": {"def": -3, "spd": 5}}', true, '2026-06-19 14:41:21.698314+00'),
	('9e7dd34d-a226-4c3d-b5b3-06382ddb04df', 'sharp_claws', 'Sharp Claws', 'common', 'Naturally sharpened claws improve physical attacks.', '+5% Attack', '-3% Magi', '{"stat_percent": {"atk": 5, "magi": -3}}', true, '2026-06-19 14:41:21.698314+00'),
	('186a43bc-5d8d-44f5-b9d5-ba2be70d0991', 'luminous_core', 'Luminous Core', 'common', 'A small inner glow strengthens this Kith’s magical output.', '+5% Magi', '-3% Attack', '{"stat_percent": {"atk": -3, "magi": 5}}', true, '2026-06-19 14:41:21.698314+00'),
	('c4d07c16-6575-445d-a106-97e4c012856b', 'deep_lungs', 'Deep Lungs', 'common', 'Expanded lungs help this Kith maintain a deeper mana reserve.', '+5% maximum Mana', '-3% Speed', '{"stat_percent": {"spd": -3, "mana_max": 5}}', true, '2026-06-19 14:41:21.698314+00'),
	('e825d802-6268-4664-b16c-2ea87267cf97', 'dense_hide', 'Dense Hide', 'common', 'Thicker skin provides extra protection from direct attacks.', '+5% Defense', '-3% maximum Mana', '{"stat_percent": {"def": 5, "mana_max": -3}}', true, '2026-06-19 14:41:21.698314+00'),
	('01daa681-f52a-41d5-b495-f57f56bf4697', 'keen_eyes', 'Keen Eyes', 'common', 'Unusually sharp eyesight helps this Kith place attacks carefully.', '+3% Accuracy', '-2% Evasion', '{"battle_percent": {"evasion": -2, "accuracy": 3}}', true, '2026-06-19 14:41:21.698314+00'),
	('f0ee3a6f-7f3b-4a33-90d7-49d682047b82', 'flexible_spine', 'Flexible Spine', 'common', 'An unusually flexible spine makes sudden evasive movement easier.', '+3% Evasion', '-2% Accuracy', '{"battle_percent": {"evasion": 3, "accuracy": -2}}', true, '2026-06-19 14:41:21.698314+00'),
	('9e30d85f-67c5-441e-aa98-bf72e4772f85', 'warm_blood', 'Warm Blood', 'common', 'A warmer body temperature helps healing effects take hold.', '+5% healing received', '-3% Ice resistance', '{"battle_percent": {"healing_received": 5}, "element_resistance_percent": {"ice": -3}}', true, '2026-06-19 14:41:21.698314+00'),
	('2db88724-e3b3-4902-806a-8f9a09eec98c', 'cool_blood', 'Cool Blood', 'common', 'A cooler body temperature improves resistance to heat.', '+5% Fire resistance', '-3% healing received', '{"battle_percent": {"healing_received": -3}, "element_resistance_percent": {"fire": 5}}', true, '2026-06-19 14:41:21.698314+00'),
	('d04cc494-f168-4c36-b711-262d849b03ac', 'static_fur', 'Static Fur', 'common', 'Charged fur occasionally bites back when touched.', '3% chance to deal minor retaliatory damage', '-2% Defense', '{"stat_percent": {"def": -2}, "chance_percent": {"minor_retaliation": 3}}', true, '2026-06-19 14:41:21.698314+00'),
	('3c890052-0270-4d7e-bade-5a7b923a13c7', 'resonant_voice', 'Resonant Voice', 'common', 'A naturally resonant call makes status skills slightly more reliable.', '+3% status-effect accuracy', '-2% physical Accuracy', '{"battle_percent": {"accuracy": -2, "status_accuracy": 3}}', true, '2026-06-19 14:41:21.698314+00'),
	('ca470783-05fc-44ee-ba10-7156aeb08283', 'elemental_veins', 'Elemental Veins', 'uncommon', 'Elemental energy runs visibly beneath this Kith’s skin.', '+8% damage with native-element skills', '-5% resistance to the element this Kith is weak against', '{"battle_percent": {"native_element_damage": 8, "weak_element_resistance": -5}}', true, '2026-06-19 14:41:21.698314+00'),
	('9c6006fb-cab6-4797-bea5-5d01caa9fa6a', 'regenerative_tissue', 'Regenerative Tissue', 'uncommon', 'Damaged tissue slowly repairs itself after combat.', 'Restore 3% maximum HP after a battle', '-5% maximum Mana', '{"stat_percent": {"mana_max": -5}, "after_battle_percent": {"restore_hp_max": 3}}', true, '2026-06-19 14:41:21.698314+00'),
	('8aaf8908-830a-42e6-bd34-60f519ff1a8c', 'predators_focus', 'Predator’s Focus', 'uncommon', 'This Kith becomes intensely focused when it sees an opening.', '+6% critical-hit chance', '-5% healing received', '{"battle_percent": {"critical_chance": 6, "healing_received": -5}}', true, '2026-06-19 14:41:21.698314+00'),
	('c30456b1-3f0e-47e9-85b2-6822f43ad019', 'guardians_crest', 'Guardian’s Crest', 'uncommon', 'A protective crest radiates a faint defensive field around allies.', 'Allies take 4% less damage while this Kith is active', '-5% Speed', '{"aura_percent": {"ally_damage_reduction": 4}, "stat_percent": {"spd": -5}}', true, '2026-06-19 14:41:21.698314+00'),
	('fbf74093-881b-4d08-8cd2-209ed59b162d', 'mana_overflow', 'Mana Overflow', 'uncommon', 'Excess mana constantly presses against this Kith’s physical defenses.', '+10% maximum Mana', '-5% Defense', '{"stat_percent": {"def": -5, "mana_max": 10}}', true, '2026-06-19 14:41:21.698314+00'),
	('c4294c15-62ef-4c5a-ab6e-e44a1894fec8', 'glass_cannon', 'Glass Cannon', 'uncommon', 'This Kith produces exceptional force but has a fragile defense.', '+8% Attack and +8% Magi', '-8% Defense', '{"stat_percent": {"atk": 8, "def": -8, "magi": 8}}', true, '2026-06-19 14:41:21.698314+00'),
	('994c4da3-a771-4df5-bce6-d858d8a870d3', 'adrenal_glands', 'Adrenal Glands', 'uncommon', 'Specialized glands flood this Kith with energy when it is wounded.', '+8% Speed while below 50% HP', '-3% Accuracy while above 50% HP', '{"conditional_percent": {"above_50_hp": {"accuracy": -3}, "below_50_hp": {"spd": 8}}}', true, '2026-06-19 14:41:21.698314+00'),
	('cf5302bc-f138-46c1-b3d6-eeba0cf1300b', 'reactive_scales', 'Reactive Scales', 'uncommon', 'These scales harden immediately after receiving a direct hit.', '+6% Defense after being hit until the end of the next turn', '-5% first-turn Attack', '{"triggered_percent": {"after_hit_def": 6}, "conditional_percent": {"first_turn": {"atk": -5}}}', true, '2026-06-19 14:41:21.698314+00'),
	('9ce272cb-12ad-4588-b190-b2b40d9d2789', 'twin_core', 'Twin Core', 'uncommon', 'Two smaller energy cores share the work of powering this Kith.', '+5% Attack and +5% Magi', '-5% maximum HP', '{"stat_percent": {"atk": 5, "magi": 5, "hp_max": -5}}', true, '2026-06-19 14:41:21.698314+00'),
	('9edf049b-408a-4881-9778-73675543ebb3', 'phoenix_marrow', 'Phoenix Marrow', 'rare', 'Fiery marrow refuses to let this Kith fall without resistance.', 'Once per battle, survive a fatal hit with 1 HP', '-8% maximum HP', '{"stat_percent": {"hp_max": -8}, "once_per_battle": {"survive_fatal_hit_hp": 1}}', true, '2026-06-19 14:41:21.698314+00'),
	('4b6eec99-11e2-4470-a214-762c416ba8d3', 'prismatic_blood', 'Prismatic Blood', 'rare', 'Rainbow-colored blood responds to every elemental current.', '+6% damage with all elemental skills', '+5% damage received from super-effective attacks', '{"battle_percent": {"all_element_damage": 6, "super_effective_damage_received": 5}}', true, '2026-06-19 14:41:21.698314+00'),
	('d410a7c0-5247-430f-8516-d444a2fa5f60', 'void_scar', 'Void Scar', 'rare', 'A dark scar disrupts hostile effects before they can fully settle.', '15% chance to resist a negative status effect', '-10% healing received', '{"battle_percent": {"healing_received": -10}, "chance_percent": {"resist_negative_status": 15}}', true, '2026-06-19 14:41:21.698314+00'),
	('6ada57bb-0e83-42f2-a826-b0214beae72d', 'titan_growth', 'Titan Growth', 'rare', 'Ancient growth patterns produced a much larger and tougher body.', '+12% maximum HP and +8% Defense', '-10% Speed', '{"stat_percent": {"def": 8, "spd": -10, "hp_max": 12}}', true, '2026-06-19 14:41:21.698314+00'),
	('61e325b0-0314-4176-b925-06c9f6b73b54', 'arcane_synapses', 'Arcane Synapses', 'rare', 'Magical signals travel through this Kith’s mind with unnatural speed.', '+12% Magi and 5% lower skill Mana costs', '-8% Attack', '{"stat_percent": {"atk": -8, "magi": 12}, "battle_percent": {"mana_cost": -5}}', true, '2026-06-19 14:41:21.698314+00'),
	('7c87e304-d9ab-49e7-a9ac-6c11e13d3db3', 'berserker_pulse', 'Berserker Pulse', 'rare', 'Pain triggers a violent pulse of battle energy.', '+15% damage while below 35% HP', '+8% damage received while below 35% HP', '{"conditional_percent": {"below_35_hp": {"damage": 15, "damage_received": 8}}}', true, '2026-06-19 14:41:21.698314+00'),
	('5a90eea6-f2f9-4c82-8211-b05bec0d0e7c', 'delta_heart', 'Delta Heart', 'legendary', 'A tiny rainbow Delta beats at the center of this Kith’s life force.', '+7% maximum HP, Mana, Attack, Defense, Speed, and Magi', '-10% healing received', '{"stat_percent": {"atk": 7, "def": 7, "spd": 7, "magi": 7, "hp_max": 7, "mana_max": 7}, "battle_percent": {"healing_received": -10}}', true, '2026-06-19 14:41:21.698314+00'),
	('d9db179c-ce2e-4f91-9bf3-1a1122de767b', 'chrono_nerves', 'Chrono Nerves', 'legendary', 'This Kith’s nerves occasionally move a fraction of a moment ahead of time.', '10% chance once per battle to immediately take one extra turn', '-10% maximum HP', '{"stat_percent": {"hp_max": -10}, "once_per_battle_chance_percent": {"extra_turn": 10}}', true, '2026-06-19 14:41:21.698314+00'),
	('0df05674-b06c-4ade-9d79-b7b676529ef7', 'aliunes_echo', 'Aliune’s Echo', 'legendary', 'A distant echo of Aliune amplifies every elemental current within this Kith.', '+15% elemental damage and 10% chance for a skill to cost no Mana', '+8% damage received', '{"battle_percent": {"damage_received": 8, "all_element_damage": 15}, "chance_percent": {"zero_mana_cost": 10}}', true, '2026-06-19 14:41:21.698314+00'),
	('353ef834-1b79-4e74-9968-678de5ac2567', 'worldroot_soul', 'Worldroot Soul', 'legendary', 'Ancient roots of living energy have intertwined with this Kith’s life force.', 'Restore 5% maximum HP at the end of each third turn', '-12% Speed', '{"stat_percent": {"spd": -12}, "turn_interval_percent": {"interval": 3, "restore_hp_max": 5}}', true, '2026-06-19 14:41:21.698314+00'),
	('c71d495e-0c1a-414c-b8d2-5b83234c1fb6', 'celestial_mirror', 'Celestial Mirror', 'legendary', 'A reflective celestial pattern occasionally turns hostile magic back toward its source.', '15% chance to reflect a negative status effect back to its source', '-10% Defense', '{"stat_percent": {"def": -10}, "chance_percent": {"reflect_negative_status": 15}}', true, '2026-06-19 14:41:21.698314+00'),
	('8ad58308-2645-46bc-940f-ebd3006db183', 'fatebreaker', 'Fatebreaker', 'legendary', 'This Kith can tear through the edge of an otherwise certain defeat.', 'Once per battle, remove all negative status effects when falling below 25% HP', '-10% maximum Mana', '{"stat_percent": {"mana_max": -10}, "once_per_battle": {"cleanse_below_hp_percent": 25}}', true, '2026-06-19 14:41:21.698314+00'),
	('32cce2e1-2084-43a1-b989-656461dba609', 'everstorm_crown', 'Everstorm Crown', 'legendary', 'A permanent crown of charged energy surrounds this Kith’s elemental core.', '+12% Speed and +12% critical-hit damage', '-10% maximum HP', '{"stat_percent": {"spd": 12, "hp_max": -10}, "battle_percent": {"critical_damage": 12}}', true, '2026-06-19 14:41:21.698314+00'),
	('9c5d3b33-b205-41f4-ae99-a65dab20c4eb', 'genesis_spark', 'Genesis Spark', 'legendary', 'A fragment of creation energy continuously shifts between physical and magical power.', 'At battle start, increase either Attack or Magi by 18%, choosing the higher stat', 'Reduce the lower offensive stat by 10%', '{"battle_start_percent": {"decrease_lower_offense": -10, "increase_higher_offense": 18}}', true, '2026-06-19 14:41:21.698314+00');


--
-- Data for Name: passive_traits; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."passive_traits" ("id", "key", "name", "stat_key", "rarity", "description", "effect_summary", "effects", "is_active", "created_at") VALUES
	('0f070cfe-b203-405c-89f7-db252333c190', 'iron_lungs', 'Iron Lungs', 'hp', 'common', 'This Kith was born with a sturdy life force.', '+1 HP', '{"hp": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('e1cc7655-4f9b-4483-8b2a-e1bceaee4ad2', 'thick_hide', 'Thick Hide', 'hp', 'uncommon', 'This Kith can take a hit better than most.', '+2 HP', '{"hp": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('fba01793-d4e0-460d-93d8-a207390b9a98', 'ancient_vitality', 'Ancient Vitality', 'hp', 'rare', 'Old life energy pulses through this Kith.', '+3 HP', '{"hp": 3}', true, '2026-06-04 14:48:26.82765+00'),
	('0f47b04d-8051-4b6d-b6a4-6e173d5f38f4', 'sharp_instinct', 'Sharp Instinct', 'atk', 'common', 'This Kith strikes with natural confidence.', '+1 Attack', '{"atk": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('67f9c2ce-fdfd-43b5-8106-7e1bed249cce', 'battleborn', 'Battleborn', 'atk', 'uncommon', 'This Kith seems eager for combat.', '+2 Attack', '{"atk": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('e24fe0c3-0cf9-482b-bee9-02c3cce90c6a', 'titan_fang', 'Titan Fang', 'atk', 'rare', 'A powerful offensive instinct sleeps within this Kith.', '+3 Attack', '{"atk": 3}', true, '2026-06-04 14:48:26.82765+00'),
	('711d6463-61e2-4925-8dbf-16a9cd6ea0bf', 'steady_shell', 'Steady Shell', 'def', 'common', 'This Kith has naturally firm defenses.', '+1 Defense', '{"def": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('cea1a42b-86ca-44df-9307-07736dbe9f88', 'stoneblood', 'Stoneblood', 'def', 'uncommon', 'The strength of stone flows through this Kith.', '+2 Defense', '{"def": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('99e79114-4fc4-44d2-9574-ad266fcefaee', 'crystal_hide', 'Crystal Hide', 'def', 'rare', 'This Kith was born with reinforced crystalline skin.', '+3 Defense', '{"def": 3}', true, '2026-06-04 14:48:26.82765+00'),
	('66244c12-9caf-41a4-8a5e-662bd541bd3a', 'quickstep', 'Quickstep', 'spd', 'common', 'This Kith moves with surprising agility.', '+1 Speed', '{"spd": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('28aa4166-e769-482c-ad11-13827e6a23db', 'wind_runner', 'Wind Runner', 'spd', 'uncommon', 'This Kith reacts faster than most.', '+2 Speed', '{"spd": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('e27adb0a-3624-4563-93f8-689f38b75400', 'storm_soul', 'Storm Soul', 'spd', 'rare', 'Lightning energy crackles beneath the surface.', '+3 Speed', '{"spd": 3}', true, '2026-06-04 14:48:26.82765+00'),
	('28630e7a-910d-44c9-afb0-b72447baca9a', 'mana_spark', 'Mana Spark', 'mana', 'common', 'A faint magical current flows through this Kith.', '+1 Mana', '{"mana": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('fb78d926-ab88-4c09-859d-81949b3dd7c6', 'deep_reservoir', 'Deep Reservoir', 'mana', 'uncommon', 'This Kith holds extra magical reserves.', '+2 Mana', '{"mana": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('99aca764-7056-49d0-a538-4c15b2601ad7', 'eternal_well', 'Eternal Well', 'mana', 'rare', 'A deep source of mana rests within this Kith.', '+3 Mana', '{"mana": 3}', true, '2026-06-04 14:48:26.82765+00'),
	('0c909a53-9d21-4257-b0bb-f2ab099c7c71', 'arcane_pulse', 'Arcane Pulse', 'magi', 'common', 'This Kith has a small but steady magical pulse.', '+1 Magi', '{"magi": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('45cae76c-5d38-46ce-a576-0c1a30ca08cd', 'spellheart', 'Spellheart', 'magi', 'uncommon', 'Magic gathers naturally around this Kith.', '+2 Magi', '{"magi": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('30738e8c-8162-4060-a15d-8ff07055c97a', 'arcane_heart', 'Arcane Heart', 'magi', 'rare', 'A powerful magical core rests within this Kith.', '+3 Magi', '{"magi": 3}', true, '2026-06-04 14:48:26.82765+00'),
	('1be00423-94e0-4b21-a414-e6886e893221', 'ancient_bloodline', 'Ancient Bloodline', 'hp', 'legendary', 'A forgotten lineage awakens within this Kith.', '+1 to strongest stat calculation later', '{"legendary": true}', true, '2026-06-04 14:48:26.82765+00'),
	('fba7f551-435e-4c97-acea-081e27906c3f', 'wild_heart', 'Wild Heart', 'hp', 'common', 'This Kith has a lively survival instinct.', '+1 HP', '{"hp": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('9e5e5d1e-369f-46ac-a5c5-4f76c354304e', 'warm_blood', 'Warm Blood', 'hp', 'uncommon', 'This Kith recovers from strain with steady endurance.', '+2 HP', '{"hp": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('25f56ee8-0e20-493e-8671-209969e3ae85', 'giant_core', 'Giant Core', 'hp', 'legendary', 'This Kith carries the impossible vitality of ancient giants.', '+4 HP', '{"hp": 4}', true, '2026-06-04 14:48:26.82765+00'),
	('2091c41c-02b1-48e2-b629-809f42a07941', 'snap_strike', 'Snap Strike', 'atk', 'common', 'This Kith reacts with sharp attacking instinct.', '+1 Attack', '{"atk": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('4b983f61-cd19-4a7b-9bec-f171db906850', 'feral_edge', 'Feral Edge', 'atk', 'uncommon', 'This Kith has a fierce natural bite.', '+2 Attack', '{"atk": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('eb604ffa-2a23-4dc2-aac1-8d7b274877cc', 'solar_claw', 'Solar Claw', 'atk', 'legendary', 'This Kith attacks with radiant force burning beneath its claws.', '+4 Attack', '{"atk": 4}', true, '2026-06-04 14:48:26.82765+00'),
	('682abb63-0213-4d7c-aade-72538f63fbfd', 'guarded_stance', 'Guarded Stance', 'def', 'common', 'This Kith naturally braces before danger.', '+1 Defense', '{"def": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('ad917c7b-feea-4a9b-8ecc-070525a08a78', 'iron_bark', 'Iron Bark', 'def', 'uncommon', 'This Kith has a hardened outer resilience.', '+2 Defense', '{"def": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('9302a60d-badb-4a6d-a45e-2da21f0818a6', 'diamond_bone', 'Diamond Bone', 'def', 'legendary', 'This Kith was born with nearly unbreakable inner structure.', '+4 Defense', '{"def": 4}', true, '2026-06-04 14:48:26.82765+00'),
	('fe567820-2ad8-4c71-8a52-0dfd89a18fec', 'light_feet', 'Light Feet', 'spd', 'common', 'This Kith steps lightly and moves with ease.', '+1 Speed', '{"spd": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('251e64b3-ac65-4f48-9b17-19e42984f3e6', 'blur_dash', 'Blur Dash', 'spd', 'uncommon', 'This Kith can burst forward with sudden speed.', '+2 Speed', '{"spd": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('f6344f5b-7441-4735-b5f5-9cb2e580adf7', 'thunder_step', 'Thunder Step', 'spd', 'legendary', 'This Kith moves like a crack of thunder across the ground.', '+4 Speed', '{"spd": 4}', true, '2026-06-04 14:48:26.82765+00'),
	('67f7cf8c-8209-4235-89c0-e6d52c4b517d', 'mana_thread', 'Mana Thread', 'mana', 'common', 'A small thread of mana runs through this Kith.', '+1 Mana', '{"mana": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('89e48156-2247-4ce5-a0d3-67e390eda234', 'moon_reservoir', 'Moon Reservoir', 'mana', 'uncommon', 'This Kith stores mana like moonlight caught in water.', '+2 Mana', '{"mana": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('ce0bc8df-f8dc-45ac-bfba-dbff1e6d341a', 'infinite_font', 'Infinite Font', 'mana', 'legendary', 'This Kith carries a mana source that feels impossibly deep.', '+4 Mana', '{"mana": 4}', true, '2026-06-04 14:48:26.82765+00'),
	('3021c2c7-0c31-4c8d-9ceb-a9d701bdcd34', 'spark_mind', 'Spark Mind', 'magi', 'common', 'This Kith understands magic with unusual instinct.', '+1 Magi', '{"magi": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('7aa5c807-8a90-45ba-9db5-ceda88fd5ab3', 'rune_touched', 'Rune Touched', 'magi', 'uncommon', 'A faint ancient mark strengthens this Kith’s magic.', '+2 Magi', '{"magi": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('3bd21cec-2f34-4f1c-b3dd-018992e07a8a', 'starborn_mind', 'Starborn Mind', 'magi', 'legendary', 'This Kith’s magic feels connected to something far above Aliune.', '+4 Magi', '{"magi": 4}', true, '2026-06-04 14:48:26.82765+00');


--
-- Data for Name: patch_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."patch_notes" ("id", "version", "title", "summary", "body", "is_published", "released_at", "created_at", "new_notes", "updated_notes", "fixed_notes", "notes") VALUES
	('73b12399-51f4-4050-b0fd-28e51f6b1c49', 'ALPHAv0.0.1-alpha.1', 'Homepage Signal and Alpha Systems Update', 'Aliune Signal and Current Alpha Systems received UI cleanup, patch support direction, and layout improvements.', 'Aliune continues to evolve.

Over the past development cycle, DeltaPets has received major improvements to its core homepage systems and interface presentation. The Aliune Signal has been refined for better clarity, patch note support has been introduced, and system panels have been cleaned up to feel more readable and player-facing.

Additional care interface improvements are also in progress, helping shape a stronger foundation for bonding, upkeep, and future pet interaction systems.

These updates continue to move DeltaPets toward a more immersive alpha experience.', true, '2026-04-04 17:07:05.923701+00', '2026-04-04 17:07:05.923701+00', '- Added support direction for a dedicated patch notes flow using the Supabase patch_notes table.
- Added a cleaner plan for patch sections using New, Updated, Fixed, and Notes.', '- Removed Report Age from Aliune Signal.
- Updated Current Alpha Systems title styling to glow green and pulse.
- Planned View Patches button move into the Current Alpha Systems header on the right side.
- Centered date values in the Current Alpha Systems panel.', '- Cleaned unnecessary Aliune Signal display clutter.
- Improved readability and visual structure for homepage system information.
- Reduced UI confusion around where patch viewing should live.', '- Patch notes are now being structured more like player-facing updates instead of raw dev logs.
- Supabase patch_notes will be used as the source for published patch entries.'),
	('3f92255b-c9fe-49d5-918f-50b3d02b07e3', 'v0.0.1-alpha.2', 'Kithna Roam + Battle Prep', 'Today''s closed alpha deploy pass starts Kithna roaming eggs and prepares the next battle/lore systems.', NULL, true, '2026-07-05 18:38:12.579054+00', '2026-07-05 18:38:12.579054+00', 'Kithna day/night roaming egg work started. A separate Kithna non-starter species pool is being used so wild eggs do not mix with starter pets.', 'Alpha Current and Announcements now explain the active deploy focus: Kithna eggs, random enemy battles, lore, and Aliune Signal cleanup.', 'Prepared the hatch flow so non-starter Kithna eggs can hatch without being treated like starter eggs.', 'Deploys may continue throughout the day. Testers should refresh after updates and report bugs with the page, device, and what they were doing.'),
	('70afa1cf-82e6-447f-b654-5b7b2c30bcd4', 'ALPHAv0.0.1-alpha.2', 'Aliune Systems Expansion & UI Overhaul', 'Core world systems and UI across DeltaPets have been expanded and refined. The Aliune Signal, homepage systems, and care interface are now more stable, readable, and built for future gameplay features.', 'Aliune continues to evolve.

This update focuses on strengthening the core systems that power DeltaPets. The Aliune Signal has been refined to better represent world conditions, while homepage systems have been cleaned up and improved for clarity and usability.

Patch note support is now live, allowing players to track changes across the world in a structured and readable way.

These improvements lay the foundation for future features, including dynamic events, deeper pet interaction systems, and a more immersive experience overall.

Stay alert, Aliune is only just beginning to wake up.', true, '2026-04-12 18:23:15.801093+00', '2026-04-12 18:23:15.801093+00', '- Added structured Patch Notes system using Supabase
- Introduced dedicated sections for New, Updated, Fixed, and Notes
- Implemented foundation for tracking world updates and system changes
- Began expansion of the Care system for future bonding and interaction features', '- Refined Aliune Signal display for improved clarity and readability
- Updated homepage layout including News, Alpha Systems, and Signal panels
- Enhanced UI styling for a more cohesive DeltaPets visual experience
- Improved Care interface layout with better stat prioritization', '- Cleaned up unnecessary Aliune Signal display clutter
- Improved readability and structure across homepage system panels
- Reduced confusion around patch note viewing location
- Fixed spacing and overflow issues across multiple UI sections', '- Patch notes are now structured to be more player-friendly instead of raw development logs
- Future updates will begin introducing world events and dynamic changes across Aliune
- Additional Care features and pet interaction systems are currently in development
- The Aliune Signal may begin reflecting more unusual activity soon'),
	('0291f572-5eb5-49bb-80b0-da7428d6f4cd', 'Alpha v0.1.2', 'Mobile Setup Pass', 'This patch starts the Mobile Setup Pass for Closed Alpha. The current focus is mobile usability: readable panels, tappable buttons, cleaner popup behavior, and making sure the core testing flow works across smaller screens.', 'This patch starts the Mobile Setup Pass for Closed Alpha. Homepage content has been refreshed with updated announcements, alpha status, patch notes, and version information. The current focus is mobile usability: readable panels, tappable buttons, cleaner popup behavior, and making sure the core testing flow works across smaller screens. Some content, balance, art, and polish are still unfinished. Please report layout bugs, overlapping panels, missing buttons, broken text, or anything that makes the site hard to use on mobile.', true, '2026-07-03 12:00:00+00', '2026-07-03 14:29:02.480447+00', '- Mobile Setup Pass has started.
- Homepage content has been refreshed for the current Closed Alpha focus.
- Alpha Current now reflects mobile layout testing and homepage stability work.', '- Announcements, Alpha Current, Patch Notes, and version information were updated for the current alpha build.
- Mobile usability is now the main testing focus.
- Popups, panels, buttons, navigation, and core testing flow are being checked on smaller screens.', '- No gameplay bugfixes are included in this content update.
- Mobile layout issues are being tracked and should be reported with screenshots.', '- Some content, balance, art, and polish are still unfinished.
- Please report overlapping panels, missing buttons, broken text, cramped layouts, or anything that makes the site hard to use on mobile.'),
	('3288c0fd-5c17-42bf-800d-19878512dfb4', 'v0.0.5-closed-Alpha', 'Kithna Roam + Battle Prep', 'Today''s closed alpha deploy pass starts Kithna roaming eggs and prepares the next battle and lore systems.', NULL, true, '2026-07-21 00:00:00+00', '2026-07-21 13:58:35.387205+00', 'Kithna day and night roaming egg work started. A separate Kithna non-starter species pool is being used so wild eggs do not mix with starter pets. Food Merchant is open in Kithna. Progress panel added to pet page.', 'Alpha Current and Announcements now explain the active deploy focus. Hatch slot flow corrected so pets land in the right party slot. Layout pass applied across all pages for 1440 alignment.', 'Prepared the hatch flow so non-starter Kithna eggs can hatch without being treated like starter eggs. Fixed duplicate pet appearing in both Storage and Kith Team. Fixed banner content alignment.', 'Deploys may continue throughout the day. Testers should refresh after updates and report bugs with the page, device, and what they were doing.');


--
-- Data for Name: personalities; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."personalities" ("id", "key", "name", "definition", "modifiers", "created_at") VALUES
	('62e23ec9-026d-4f03-aa5d-40777818d49c', 'brightspark', 'Brightspark', 'Curious and energetic. Loves discovering new things and experimenting. Bonds through novelty and exploration.', '{"loot_find_pct": 0.02, "mood_decay_pct": 0.02, "training_gain_pct": 0.03}', '2026-02-11 15:38:54.383445+00'),
	('9f169b66-6d36-48dc-9ecf-ca9c437c3d6b', 'stoic', 'Stoic', 'Calm under pressure. Rarely panics, rarely overreacts. Reliable even when neglected briefly.', '{"def_pct": 0.05, "spd_pct": -0.01, "mood_decay_pct": -0.03}', '2026-02-11 15:38:54.383445+00'),
	('0fc7800b-dcd2-40eb-9fe7-d374dbf15627', 'gremlin', 'Gremlin', 'Mischief incarnate. Gets into everything, rearranges your stuff, and somehow makes it endearing.', '{"spd_pct": 0.03, "bond_gain_pct": 0.01, "loot_find_pct": 0.03, "mood_decay_pct": 0.02}', '2026-02-11 15:38:54.383445+00'),
	('da26d1f9-c02e-43a7-92e2-b55ecce22251', 'gentle', 'Gentle', 'Soft-hearted and affectionate. Thrives on care and routine. Doesn’t love conflict.', '{"hp_pct": 0.02, "atk_pct": -0.02, "bond_gain_pct": 0.05}', '2026-02-11 15:38:54.383445+00'),
	('d02fe132-191b-41c2-a3cd-5adb96be1461', 'blazeborn', 'Blazeborn', 'Competitive and bold. Wants challenges and attention. Loves the Gym; hates being ignored.', '{"atk_pct": 0.05, "bond_gain_pct": 0.01, "mood_decay_pct": 0.03}', '2026-02-11 15:38:54.383445+00'),
	('8728234d-f5dd-4004-824a-0eddf9f76ea5', 'drifter', 'Drifter', 'Independent and low-maintenance. Doesn’t demand much, but bonds slowly and honestly.', '{"bond_gain_pct": -0.01, "mood_decay_pct": -0.02, "training_gain_pct": 0.02}', '2026-02-11 15:38:54.383445+00'),
	('4724adc0-114a-40a4-b644-7a5b953c8cda', 'guardian', 'Guardian', 'Protective and vigilant. Steps in first, shields others, and takes responsibility seriously.', '{"hp_pct": 0.03, "def_pct": 0.05, "spd_pct": -0.02}', '2026-02-11 15:38:54.383445+00'),
	('90b37c13-245c-4297-ac4e-4ab1f2bfb6ae', 'dreamer', 'Dreamer', 'Head in the clouds. Sometimes misses cues, sometimes finds weird hidden truths. Pure vibe creature.', '{"magi_pct": 0.04, "loot_find_pct": 0.02, "mood_decay_pct": -0.01, "training_gain_pct": -0.01}', '2026-02-11 15:38:54.383445+00'),
	('1ebcd85a-11be-4c7c-be51-41801850126a', 'sprinter', 'Sprinter', 'Restless and hyper. Loves movement and action. Gets cranky when stuck idle.', '{"spd_pct": 0.05, "mood_decay_pct": 0.02, "hunger_decay_pct": 0.03}', '2026-02-11 15:38:54.383445+00'),
	('310d67d1-e5f7-4aa5-aefb-039752cbdc15', 'scholar', 'Scholar', 'Analytical and focused. Learns efficiently and prefers structured improvement.', '{"magi_pct": 0.03, "bond_gain_pct": -0.01, "training_gain_pct": 0.04}', '2026-02-11 15:38:54.383445+00'),
	('8aa964ba-75cc-4ec7-a93e-8e8bbd228c5b', 'glutton', 'Glutton', 'Food-motivated and always hungry. Feeding gives big bond gains… but the hunger drain is real.', '{"hp_pct": 0.03, "bond_gain_pct": 0.02, "hunger_decay_pct": 0.05}', '2026-02-11 15:38:54.383445+00'),
	('630766e1-f056-40e4-b5cc-9de22b25ba46', 'prankster', 'Prankster', 'Playful trickster. Turns care into games. Chaos increases happiness—until it doesn’t.', '{"spd_pct": 0.02, "bond_gain_pct": 0.02, "loot_find_pct": 0.01, "mood_decay_pct": 0.02}', '2026-02-11 15:38:54.383445+00'),
	('2d9d9e86-46d8-41d7-a564-f4a6f7821abd', 'loyalist', 'Loyalist', 'Deeply attached. Once bonded, becomes your ride-or-die. Hates inconsistent routines.', '{"def_pct": 0.02, "bond_gain_pct": 0.06, "mood_decay_pct": 0.02}', '2026-02-11 15:38:54.383445+00'),
	('4ccdbc88-9277-4268-876d-c5f544ffee5c', 'anxious', 'Anxious', 'Needs reassurance. Strong bond potential, but neglect hits harder. Big feelings, tiny creature.', '{"def_pct": 0.02, "bond_gain_pct": 0.03, "mood_decay_pct": 0.06}', '2026-02-11 15:38:54.383445+00'),
	('43c71d87-98cd-4d50-9305-c21c84353ff4', 'radiant', 'Radiant', 'Upbeat and warm. Spreads good vibes. Stable, friendly, and surprisingly resilient.', '{"hp_pct": 0.02, "bond_gain_pct": 0.02, "mood_decay_pct": -0.03}', '2026-02-11 15:38:54.383445+00'),
	('7f489d5e-dacb-4132-bf1f-61659e755563', 'shadowed', 'Shadowed', 'Quiet observer. Hard to read. Doesn’t show affection loudly, but notices everything.', '{"def_pct": 0.03, "magi_pct": 0.02, "bond_gain_pct": -0.01, "mood_decay_pct": -0.01}', '2026-02-11 15:38:54.383445+00'),
	('5401f14d-e8fa-4ce6-b7eb-4d44723a2c5a', 'wildheart', 'Wildheart', 'Instinct-driven and free. Thrives when given variety. Dislikes strict schedules.', '{"atk_pct": 0.03, "spd_pct": 0.02, "mood_decay_pct": 0.03, "training_gain_pct": 0.01}', '2026-02-11 15:38:54.383445+00'),
	('bc0feb4e-c91f-4914-979d-0f688c1c38e7', 'tinker', 'Tinker', 'Obsessed with items and gear. Gets excited by upgrades and inventory interactions.', '{"atk_pct": -0.01, "loot_find_pct": 0.05, "training_gain_pct": 0.02}', '2026-02-11 15:38:54.383445+00'),
	('eeae3159-a98d-4c25-af60-07a072f5e08b', 'royal', 'Royal', 'Proud and picky. Demands quality care. When satisfied, performs like a champ.', '{"atk_pct": 0.03, "def_pct": 0.03, "bond_gain_pct": -0.01, "mood_decay_pct": 0.02}', '2026-02-11 15:38:54.383445+00'),
	('c8ff92c1-76b3-4b43-9bf3-32c661dd1d70', 'feral', 'Feral', 'Untamed and intense. Harder to bond early, but hits like a truck once stabilized.', '{"atk_pct": 0.06, "def_pct": -0.01, "bond_gain_pct": -0.02, "mood_decay_pct": 0.04}', '2026-02-11 15:38:54.383445+00'),
	('0d6a6b66-e8b0-4ad8-bdf5-de560f325b50', 'friendly', 'Friendly', 'Warm and easy to bond with. Enjoys company and responds well to kind care.', '{}', '2026-04-14 19:05:44.517181+00'),
	('70fa9830-a99c-4e63-8fd1-c2e8d03c4ba4', 'honest', 'Honest', 'Straightforward and sincere. Rarely hides intent and builds trust steadily.', '{}', '2026-04-14 19:05:44.517181+00'),
	('cc2a6fd8-e69c-49bd-961b-ca9fcff40d26', 'deceiver', 'Deceiver', 'Clever and misleading. Hard to read, with motives that are not always clear.', '{}', '2026-04-14 19:05:44.517181+00'),
	('e7e10bf6-e24a-43b6-af75-ce78c121c9fd', 'loyal', 'Loyal', 'Forms deep attachments and stays committed once trust is earned.', '{}', '2026-04-14 19:05:44.517181+00'),
	('16235e76-78e9-4e82-bcb3-964a10117969', 'cowardly', 'Cowardly', 'Easily startled and cautious under pressure. Prefers safety over risk.', '{}', '2026-04-14 19:05:44.517181+00'),
	('f51f0481-bec4-4274-b2b3-bd25b9983812', 'brave', 'Brave', 'Bold in danger and willing to face threats head-on.', '{}', '2026-04-14 19:05:44.517181+00'),
	('bd33227d-37e9-42c5-8486-d1a006a351fb', 'vengeful', 'Vengeful', 'Holds grudges and remembers slights. Pushes hard when wronged.', '{}', '2026-04-14 19:05:44.517181+00'),
	('edd59953-d733-4b4c-9401-c9724838947f', 'impulsive', 'Impulsive', 'Acts quickly without much hesitation. Fast to move, fast to react.', '{}', '2026-04-14 19:05:44.517181+00'),
	('259964b9-5c33-4638-a3fc-c2e86ba6d28e', 'reasonable', 'Reasonable', 'Balanced and level-headed. Makes steady choices without extremes.', '{}', '2026-04-14 19:05:44.517181+00'),
	('b85b695f-fabe-431b-a4f1-2e01bb7c054b', 'lazy', 'Lazy', 'Prefers comfort and low effort. Conserves energy whenever possible.', '{}', '2026-04-14 19:05:44.517181+00'),
	('87f75ba8-25a9-4f00-86b6-df1e6dd2b65a', 'diligent', 'Diligent', 'Hardworking and consistent. Responds well to routine and structure.', '{}', '2026-04-14 19:05:44.517181+00'),
	('6199c210-df6d-430b-b2a5-9eaeaa60cf00', 'naive', 'Naive', 'Trusting and innocent. May overlook danger or hidden motives.', '{}', '2026-04-14 19:05:44.517181+00'),
	('d74658e4-898e-4287-b05a-c352b2200e83', 'cruel', 'Cruel', 'Harsh and unfeeling. Can be difficult to bond with through normal care.', '{}', '2026-04-14 19:05:44.517181+00'),
	('86a5d752-a540-43ef-b24d-9f8ea8ffbce0', 'optimistic', 'Optimistic', 'Looks for the bright side. Keeps morale high even when things go wrong.', '{}', '2026-04-14 19:05:44.517181+00'),
	('de098307-7803-486c-b5f8-53432f6a1e94', 'pessimistic', 'Pessimistic', 'Expects setbacks and disappointment. Harder to reassure once upset.', '{}', '2026-04-14 19:05:44.517181+00'),
	('d8fdd13c-cb4f-4a36-9057-6dfa13848cb3', 'arrogant', 'Arrogant', 'Proud and self-assured. Dislikes weakness and demands respect.', '{}', '2026-04-14 19:05:44.517181+00'),
	('6cd14d82-2875-4ca2-9ae2-973b7837bcbe', 'humble', 'Humble', 'Quiet and grounded. Does not seek attention and adapts easily.', '{}', '2026-04-14 19:05:44.517181+00'),
	('a2a54935-2c20-4100-a936-6e85c280d203', 'snob', 'Snob', 'Picky and refined. Responds better to high-quality treatment.', '{}', '2026-04-14 19:05:44.517181+00'),
	('130189ff-b14a-4d59-a023-161027ade44a', 'respectful', 'Respectful', 'Polite and disciplined. Works well with steady, proper care.', '{}', '2026-04-14 19:05:44.517181+00'),
	('b36e5561-f87b-4688-98a2-aa6c2e9d22f0', 'greedy', 'Greedy', 'Always wants more. Strongly motivated by food, items, or rewards.', '{}', '2026-04-14 19:05:44.517181+00'),
	('a77873d8-0a63-4702-8026-37f6ed2ee7dd', 'generous', 'Generous', 'Freely gives and responds well to shared affection and support.', '{}', '2026-04-14 19:05:44.517181+00'),
	('f9b0867f-edb7-4c44-8f3e-3e489581808e', 'kind', 'Kind', 'Gentle and compassionate. Easy to comfort and pleasant to raise.', '{}', '2026-04-14 19:05:44.517181+00');


--
-- Data for Name: retired_kith_species; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."retired_kith_species" ("species_key", "display_name", "element_key", "retirement_group", "retirement_note", "created_at") VALUES
	('kithna_day_pet_01', 'Ripplin', 'water', 'Closed Alpha', 'Retired to the void of unused Alpha content.', '2026-08-07 19:04:53.268984+00'),
	('kithna_day_pet_02', 'Peblin', 'earth', 'Closed Alpha', 'Retired to the void of unused Alpha content.', '2026-08-07 19:04:53.268984+00'),
	('kithna_day_pet_03', 'Glimmet', 'light', 'Closed Alpha', 'Retired to the void of unused Alpha content.', '2026-08-07 19:04:53.268984+00'),
	('kithna_night_pet_01', 'Frilo', 'ice', 'Closed Alpha', 'Retired to the void of unused Alpha content.', '2026-08-07 19:04:53.268984+00'),
	('kithna_night_pet_03', 'Murklin', 'shadow', 'Closed Alpha', 'Retired to the void of unused Alpha content.', '2026-08-07 19:04:53.268984+00');


--
-- Data for Name: rune_defs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."rune_defs" ("id", "key", "name", "description", "rune_number", "stage_tier", "vocabulary_group", "is_active", "created_at", "updated_at") VALUES
	('696d7885-5584-41d5-992c-cc6508fae03e', 'rune_of_feeling', 'Rune of Feeling', 'Reveals emotions and physical states in Hatchling speech.', 1, 'hatchling', 'feeling', true, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('f81567d8-e91b-4898-a822-f77ceee3318d', 'rune_of_need', 'Rune of Need', 'Reveals basic needs such as food, sleep, play, cleanliness, and help.', 2, 'hatchling', 'need', true, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('57532897-6857-4180-81a7-85949f192eac', 'rune_of_recognition', 'Rune of Recognition', 'Reveals words connected to identity, names, friendship, home, and return.', 3, 'hatchling', 'recognition', true, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('2c4b1c2b-1e0c-431b-8a9c-6ce944c8d235', 'rune_of_motion', 'Rune of Motion', 'Reveals simple actions and commands such as come, go, stay, give, and stop.', 4, 'hatchling', 'motion', true, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('10c49b53-eff1-46fd-9b63-ab55e56b46e5', 'rune_of_first_speech', 'Rune of First Speech', 'Completes the player''s understanding of ordinary Hatchling speech.', 5, 'hatchling', 'hatchling_fluency', true, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('a1cd80ee-cf29-49c8-a097-4cc6904fa0d1', 'rune_of_preference', 'Rune of Preference', 'Reveals how a Lowform expresses likes, dislikes, favorites, and avoidance.', 6, 'lowform', 'preference', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('fc74e0f5-8dec-4370-93c3-6c8064c4c11e', 'rune_of_memory', 'Rune of Memory', 'Reveals words connected to previous events, remembrance, and passing time.', 7, 'lowform', 'memory', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('1959dc2a-4f42-45a2-9504-ade4cb33465a', 'rune_of_questioning', 'Rune of Questioning', 'Reveals questions involving why, where, when, and how.', 8, 'lowform', 'questioning', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('83b69bd9-dd66-4b52-8632-6211388caad0', 'rune_of_intention', 'Rune of Intention', 'Reveals plans, choices, requests, and deliberate actions.', 9, 'lowform', 'intention', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('12e41147-7448-4b09-85e1-8b74dea09f1a', 'rune_of_growing_speech', 'Rune of Growing Speech', 'Completes the player''s understanding of ordinary Lowform speech.', 10, 'lowform', 'lowform_fluency', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('4411f88e-8dbc-4465-8d52-97f42a7a89f3', 'rune_of_trust', 'Rune of Trust', 'Reveals language concerning trust, doubt, loyalty, and betrayal.', 11, 'highform', 'trust', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('2e5616c4-2e9e-432a-9bd3-6aebfb059a43', 'rune_of_reflection', 'Rune of Reflection', 'Reveals thoughts about identity, growth, and previous forms.', 12, 'highform', 'reflection', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('65071a4e-13ec-4519-9f1a-3c9bf4ed0fb8', 'rune_of_contradiction', 'Rune of Contradiction', 'Reveals mixed emotions and thoughts that appear to conflict.', 13, 'highform', 'contradiction', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('31bc099c-37c2-4b6f-8f15-d24d1a091ac5', 'rune_of_instinct', 'Rune of Instinct', 'Reveals how passive traits, mutations, and natural impulses are experienced.', 14, 'highform', 'instinct', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('30956414-79ac-4aee-8cde-a4ffa85053ff', 'rune_of_knowing_speech', 'Rune of Knowing Speech', 'Completes the player''s understanding of ordinary Highform speech.', 15, 'highform', 'highform_fluency', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('bea33557-e25f-4b73-b070-1e2b4df59751', 'rune_of_resonance', 'Rune of Resonance', 'Reveals elemental sensations and the way a Legion experiences its element.', 16, 'legion', 'resonance', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('6fc4e76a-3d13-4084-b434-cb2c04809589', 'rune_of_echoes', 'Rune of Echoes', 'Reveals ancestral impressions and memories that do not belong to one lifetime.', 17, 'legion', 'echoes', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('7fe12e04-8d04-43d1-9ffb-58ca593a3405', 'rune_of_corruption', 'Rune of Corruption', 'Reveals language used to describe corruption and unstable energy.', 18, 'legion', 'corruption', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('3e54690c-84c0-405d-9dcb-0d7da7e72e0a', 'rune_of_many_thoughts', 'Rune of Many Thoughts', 'Reveals layered emotions and several connected thoughts expressed together.', 19, 'legion', 'many_thoughts', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('5a64b5a4-e749-4fe6-a375-97a4a042383c', 'rune_of_aliune', 'Rune of Aliune', 'Reveals ancient concepts tied to Aliune, its people, and its history.', 20, 'legion', 'aliune', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('1073f927-b18d-4ca4-9db2-7dbe78a82438', 'rune_of_legion_speech', 'Rune of Legion Speech', 'Completes the player''s understanding of ordinary Legion speech.', 21, 'legion', 'legion_fluency', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('5f67f124-1b7c-464b-bbfa-b5e386ee8a5b', 'rune_of_distance', 'Rune of Distance', 'Reveals awareness of places and presences beyond the pet''s immediate world.', 22, 'mythical_legendary', 'distance', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('9d5f29f5-9e7e-498b-9234-ef8a05d90a53', 'rune_of_continuance', 'Rune of Continuance', 'Reveals memories and identity carried through every evolved form.', 23, 'mythical_legendary', 'continuance', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('6d69ade2-468b-4a65-a7b5-b6f8d8cb1450', 'rune_of_true_names', 'Rune of True Names', 'Reveals language connected to deep identity, origin, and true names.', 24, 'mythical_legendary', 'true_names', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('15439787-3e31-4e71-a80e-e02811c062c8', 'rune_of_the_other_side', 'Rune of the Other Side', 'Reveals a Mythical Legendary pet''s awareness of the player beyond Aliune.', 25, 'mythical_legendary', 'other_side', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('ff276cfb-8c4c-46bc-8dac-b5f543ae6710', 'rune_of_understanding', 'Rune of Understanding', 'Completes the player''s understanding of Delta language across every form.', 26, 'mythical_legendary', 'complete_fluency', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00');


--
-- Name: signup_trigger_errors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."signup_trigger_errors_id_seq"', 22, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict risWNvg6H0p69jxGcm14kCpboVahkXFSszWQFv4gHORw9uwIemgUxdeOpNQgghS

RESET ALL;

-- Clean initial Poe Tay Toe runtime state.
INSERT INTO public.poe_tay_toe_state (
  id,
  current_location_key,
  hidden_by_user_id,
  claimed_by_user_id,
  claimed_at,
  find_count,
  updated_at
)
VALUES (
  1,
  'hatchery-back',
  NULL,
  NULL,
  NULL,
  0,
  now()
)
ON CONFLICT (id) DO NOTHING;
