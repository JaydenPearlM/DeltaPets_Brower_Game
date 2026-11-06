const assert = require('node:assert/strict');
const { CHARACTER_PROFILES, findCharacterProfileBySpeciesId } = require('../backend/server/dist/shared/pets/characterProfiles/characterRegistry.js');

assert.equal(CHARACTER_PROFILES.length, 14);
for (const profile of CHARACTER_PROFILES) {
  const speech = profile.communication;
  assert.equal(speech.language, 'direct_understandable_speech', profile.species_key);
  assert.equal(speech.understood_from_start, true);
  assert.equal(speech.spoken_language_available_at_hatching, true);
  assert.equal(speech.translation_system_enabled, false);
  assert.equal(speech.comprehension_requires_bond_or_runes, false);
  assert.equal(speech.comprehension_gated_by_personality_bond_trust_or_mood, false);
  for (const key of ['language_file', 'starts_translated', 'bond_affects_comprehension', 'runes_affect_comprehension']) {
    assert.equal(key in speech, false);
  }
  for (const id of profile.species_ids) assert.equal(findCharacterProfileBySpeciesId(id), profile);
  if (profile.request_dialogue) {
    assert.equal(profile.request_dialogue.always_understandable, true);
    for (const tier of ['low', 'medium', 'high', 'lifelong']) {
      assert.equal('comprehension' in profile.request_dialogue[tier], false);
      assert.equal(profile.bond_behavior[tier].communication, 'understandable_speech');
    }
  }
}
const twiglet = findCharacterProfileBySpeciesId('earth_starter');
assert.equal(twiglet.schema_version, 2);
assert.equal(twiglet.element, 'earth');
assert.deepEqual(Object.values(twiglet.evolution), ['Twiglet', 'Treeflip', 'Radaroot', 'Roovine', null]);
assert.equal(twiglet.progression.maximum_level, 30);
const skills = twiglet.progression.skills;
assert.equal(skills.basic_combat_action.skill_id, 'basic-strike');
assert.equal(skills.level_2_skill_choice.automatic_grant, false);
assert.equal(skills.hatchling_move_design_draft.implementation_approved, false);
assert.deepEqual(skills.hatchling_move_design_draft.candidate_moves.map(move => move.name), ['Root Brace', 'Sprout Mend', 'Seed Tap', 'Pollen Puff']);
for (const move of skills.hatchling_move_design_draft.candidate_moves) {
  assert.equal(move.element, 'earth');
  for (const key of ['damage', 'healing_amount', 'defense_modifier', 'duration_turns', 'accuracy', 'mana_cost', 'cooldown']) assert.equal(move[key], null);
}
assert.equal(findCharacterProfileBySpeciesId('unregistered-species'), null);
console.log('PASS: 14 registered profiles, ungated communication, registry lookup, and proposal-only Twiglet skills.');
