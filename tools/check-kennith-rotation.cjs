const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const ts = createRequire(path.resolve('frontend/web/package.json'))('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, esModuleInterop:true},
}).outputText, filename);
const {getKennithDay} = require('../backend/server/src/lib/kennithDay.ts');
const {kennithCatalog,selectKennithItems} = require('../frontend/web/src/lib/kithna/kennithCatalog.ts');
const midnight = Date.UTC(2026,9,30,4,45); // 285 real minutes into cycle = 00:00 Aliune.
const before = getKennithDay(midnight-1);
const after = getKennithDay(midnight);
assert.equal(after.deltaDay,before.deltaDay+1);
assert.equal(Date.parse(before.nextRotationAt),midnight);
assert.equal(Date.parse(after.nextRotationAt),midnight+21600000);
assert.equal(getKennithDay(Date.UTC(2026,9,30,6)).deltaDay,after.deltaDay);
for(const category of Object.keys(kennithCatalog)) {
  const seen = new Set();
  for(let day=after.deltaDay;day<after.deltaDay+30;day++) {
    const items=selectKennithItems(category,day);
    assert.equal(items.length,5);
    assert.equal(new Set(items.map(x=>x.slug)).size,5);
    assert.deepEqual(items,selectKennithItems(category,day));
    items.forEach(x=>seen.add(x.slug));
  }
  assert.equal(seen.size,kennithCatalog[category].length);
}
console.log('PASS: Aliune midnight boundary, stable five-item selections, no duplicates, full catalog coverage over 30 days.');

const {kennithDailyStock} = require('../backend/server/src/lib/kennithStock.ts');
for (let day=after.deltaDay;day<after.deltaDay+30;day++) {
  const stock=kennithDailyStock(day);
  assert.deepEqual(stock,kennithDailyStock(day));
  assert.equal(stock.length,20);
  for (const [category,price,min,max] of [['clothing',30,5,12],['accessories',25,3,8],['relics',40,2,6],['petCare',10,8,20]]) {
    const items=stock.filter(item=>item.category===category);
    assert.deepEqual(items.map(item=>item.slug),selectKennithItems(category,day).map(item=>item.slug));
    for (const item of items) {
      assert.equal(item.price,price);
      assert(Number.isInteger(item.stock) && item.stock>=min && item.stock<=max);
    }
  }
}
console.log('PASS: server JSON selection matches previews; all approved prices and starting stock ranges over 30 days.');
