# Wildwood environment art

Five standalone entrance PNGs are now available: `wildwood_entrance_dawn.png`,
`wildwood_entrance_day.png`, `wildwood_entrance_twilight.png`,
`wildwood_entrance_night.png`, and `wildwood_entrance_deep_night.png`.
They were generated from the approved concept reference, with Day as the master
composition for lighting edits. These are full scenes, not cropped thumbnails.
The other five locations still use the existing WildwoodScene inline SVG fallback.

Add approved individual PNGs here as `wildwood_[location]_[phase].png`.

Locations: `entrance`, `forest_path`, `creek_crossing`, `flower_glade`,
`shadow_hollow`, `corrupted_land`.

Phases: `dawn`, `day`, `twilight`, `night`, `deep_night`.
All phase variants of a location must retain identical geometry and perspective.

The registry in `pages/Cities/Kithna/Wildwood/wildwoodArt.ts` discovers only actual
matching files. A missing phase uses that location's day PNG, then the existing
SVG. Runtime image failures also expose the SVG. The clock's additional Dusk phase
uses Twilight artwork, then the same day/SVG fallback. No clock calculations
or gameplay rules depend on this library.

The existing brush/clearing/creek/ancient scene IDs remain unchanged; their new
asset names do not change room progression or rename the current UI headings.
