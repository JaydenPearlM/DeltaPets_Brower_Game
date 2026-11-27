export function entryDestination(state: {
  intro_seen?: boolean;
  has_hatchery_egg?: boolean;
  has_hatched_pet?: boolean;
}): string {
  if (state.has_hatched_pet) return "/profile";
  if (state.has_hatchery_egg) return "/hatchery";
  return state.intro_seen ? "/create" : "/first-entry";
}
