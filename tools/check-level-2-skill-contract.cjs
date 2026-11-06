const assert = require('node:assert/strict');
const twiglet = require('../backend/server/src/shared/pets/characterProfiles/starters/twiglet.json');
const skills = twiglet.progression.skills;
const choice = skills.level_2_skill_choice;
assert.equal(choice.level, 2);
assert.equal(choice.selection_count, 1);
assert.equal(choice.selection_method, 'player_choice');
assert.equal(choice.milestone_key, 'level-2');
assert.equal(choice.automatic_grant, false);
assert.equal(choice.eligible_does_not_mean_learned_or_equipped, true);
assert.deepEqual(choice.candidate_skill_ids, ['root-brace', 'sprout-mend', 'seed-tap', 'pollen-puff']);
assert.deepEqual(choice.offered_roles, ['tank', 'healer', 'dps', 'sorcerer']);
const candidates = skills.hatchling_move_design_draft.candidate_moves;
assert.equal(skills.hatchling_move_design_draft.implementation_approved, false);
assert.equal(candidates.length, 4);
for (const [index, candidate] of candidates.entries()) {
  assert.equal(candidate.proposed_skill_id, choice.candidate_skill_ids[index]);
  assert.equal(candidate.role, choice.offered_roles[index]);
  assert.equal(candidate.element, 'earth');
  assert.equal(candidate.proposed_unlock_level, 2);
  for (const key of ['damage', 'healing_amount', 'defense_modifier', 'duration_turns', 'accuracy', 'mana_cost', 'cooldown']) {
    assert.equal(candidate[key], null);
  }
}
for (const milestone of skills.skill_unlocks_by_level) {
  assert.deepEqual(milestone.moves, []); // No automatic grants, including Levels 3–30.
}
console.log('PASS: one player-selected Level 2 Earth skill; no automatic grants or invented combat values.');
