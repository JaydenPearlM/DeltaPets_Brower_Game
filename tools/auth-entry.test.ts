import assert from "node:assert/strict";
import { test } from "node:test";
import { entryDestination } from "../frontend/web/src/app/entry/entryDestination";

test("new players enter through the Aliune confirmation panel", () => {
  assert.equal(entryDestination({}), "/first-entry");
});
test("interrupted intros without eggs resume create", () => {
  assert.equal(entryDestination({ intro_seen: true }), "/create");
});
test("returning eggs resume hatchery regardless of legacy intro flag", () => {
  for (const intro_seen of [false, true]) {
    assert.equal(entryDestination({ intro_seen, has_hatchery_egg: true }), "/hatchery");
  }
});
test("hatched pets take precedence over intro flag and spare eggs", () => {
  for (const intro_seen of [false, true]) {
    for (const has_hatchery_egg of [false, true]) {
      assert.equal(entryDestination({ intro_seen, has_hatchery_egg, has_hatched_pet: true }), "/pets");
    }
  }
});
