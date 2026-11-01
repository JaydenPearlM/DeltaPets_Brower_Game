// Storage-card interaction + SSR fixture. No auth or database access.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const req = Module.createRequire(path.resolve('frontend/web/package.json'));
const React = req('react'), ts = req('typescript'), server = req('react-dom/server');
const file = path.resolve('frontend/web/src/components/Hatchery/pages/storage/PetStoragePanel.tsx');
const realLoad = Module._load;
const portrait = '/src/kith/assets/legendary/velune.png';
Module._load = function(name, parent, ...rest) {
  if (parent?.filename === file) {
    if (name.endsWith('.css')) return {};
    if (name.endsWith('.png')) return name.startsWith('@/') ? '/src/' + name.slice(2) : portrait;
    if (name.includes('starterPortraits')) return {getStarterPortrait: () => portrait};
    if (name.includes('kithnaPortraits')) return {getKithnaPortrait: () => null};
    if (name === '@shared/pets/species') return {ELEMENT_EGG_NAMES: {water: 'Tide Egg'}, findNonStarterSpeciesById: id => id === 'kithna_shade' ? {rarity: 'common'} : null, SHARED_SPECIES: [], VELUNE: {id: 'velune'}};
    if (name === './usePetStorage' || name.includes('MainTeam')) return {};
  }
  return realLoad.call(this, name, parent, ...rest);
};
const mod = new Module(file, module); mod.filename = file; mod.paths = Module._nodeModulePaths(path.dirname(file));
try {mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8') + '\nexport { StoragePetCard };', {
  compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true},
}).outputText, file);} finally {Module._load = realLoad;}
const Card = mod.exports.StoragePetCard;
function nodes(n) {if (Array.isArray(n)) return n.flatMap(nodes); return n && typeof n === 'object' ? [n,...nodes(n.props?.children)] : [];}
const calls = [];
const base = {pet: {id: 'fixture', name: 'Example Kith', stage: 'hatchling', is_favorite: false},
  isDragging: false, targetSlot: 1, isWorking: false, favoriteBusy: false, incubatorBusy: false,
  onFavorite: (...args) => calls.push(['favorite', ...args]), onSelectPet: () => calls.push(['options']),
  onDragStart: () => calls.push(['drag']), onDragEnd() {}, onMoveEggToIncubator: id => calls.push(['incubate', id])};
let tree = Card(base), star = nodes(tree).find(n => n.props.className === 'storageFavorite');
assert.equal(star.props.children, '☆'); assert.equal(star.props['aria-pressed'], false);
let stopped = false; star.props.onClick({stopPropagation() {stopped = true;}});
assert(stopped); assert.deepEqual(calls.pop(), ['favorite', 'fixture', true]);
tree.props.onDragStart({}); assert.equal(calls.pop()[0], 'drag');
nodes(tree).find(n => n.props.className?.includes('storageActionBtn--options')).props.onClick();
assert.equal(calls.pop()[0], 'options');
assert(nodes(tree).some(n => n.type.name === 'StoragePetStatsTooltip'));
tree = Card({...base, pet: {...base.pet, is_favorite: true}});
star = nodes(tree).find(n => n.props.className === 'storageFavorite');
assert.equal(star.props.children, '★'); star.props.onClick({stopPropagation() {}});
assert.deepEqual(calls.pop(), ['favorite', 'fixture', false]);
assert.equal(tree.props.draggable, true);
assert(nodes(Card({...base, pet: {...base.pet, is_favorite: undefined}})).find(n => n.props.className === 'storageFavorite').props.disabled);
tree = Card({...base, pet: {...base.pet, stage: 'egg', line: 'water'}});
assert.equal(tree.props.draggable, false);
const egg = nodes(tree).find(n => n.props.className === 'storageEggImage');
assert(egg.props.src.includes('tide_normal.png'));
nodes(tree).find(n => n.type === 'button' && n.props.children === 'Incubate').props.onClick();
assert.deepEqual(calls.pop(), ['incubate', 'fixture']);
for (const rarity of ['common', 'uncommon', 'rare', 'epic']) {
  const card = Card({...base, pet: {...base.pet, rarity}});
  assert.equal(nodes(card).find(n => n.props.className === 'storageRarityBadge ' + rarity).props.children,
    rarity[0].toUpperCase() + rarity.slice(1));
}
const shade = Card({...base, pet: {...base.pet, species: 'kithna_shade'}});
assert.equal(nodes(shade).find(n => n.props.className === 'storageRarityBadge common').props.children, 'Common');
console.log('PASS storage rarity labels and star/pressed state/disabled state, Options, drag, tooltip and egg/incubation component contracts.');
if (process.argv.includes('--fixture')) {
  const css = ['global.css','mobile.css','components/Hatchery/pages/HatcheryPage.css','components/Hatchery/pages/storage/PetStoragePanel.css']
    .map(f => fs.readFileSync('frontend/web/src/' + f,'utf8')).join('\n');
  const cards = Array.from({length: 8}, (_,i) => React.createElement(Card, {...base, key:i,
    pet:{...base.pet, id:String(i), name:i===3?'Long example Kith name':'Example Kith', is_favorite: i%2===0,
      stage:i===7?'egg':'hatchling', line:'water'}}));
  fs.writeFileSync('frontend/web/storage-review.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+css+
    '</style></head><body><main class="hatcheryPage" style="width: min(100%, 650px);margin:auto"><section class="storedPetsInlineSection"><div class="storagePetGrid">'+
    server.renderToStaticMarkup(cards)+'</div></section></main></body></html>');
}
