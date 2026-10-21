import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const json = path => JSON.parse(read(path));
const locales = ['zh-Hant', 'en', 'ko', 'ja', 'vi', 'ur'];
const html = read('dist/index.html');
const layout = json('dist/assets/whitepaper-structure.json');
const assets = json('dist/assets/asset-keys.json');
const sortedKeys = value => Object.keys(value).sort();
const reference = Object.fromEntries(['home', 'whitepaper'].map(kind => [kind, json(`content/${kind}-source.json`)]));
const dictionaries = {};

for (const locale of locales) {
  dictionaries[locale] = {};
  for (const kind of ['home', 'whitepaper']) {
    const dict = json(`dist/locales/${kind}.${locale}.json`);
    dictionaries[locale][kind] = dict;
    assert.deepEqual(sortedKeys(dict), sortedKeys(reference[kind]), `${kind}/${locale}: translation keys`);
    for (const [key, value] of Object.entries(dict)) {
      assert.equal(typeof value, 'string', `${locale}/${key}`);
      assert.ok(value.trim() && !/[\uFFFD\u2E80-\u2FFF]/u.test(value), `${locale}/${key}: empty or damaged text`);
      if (['en', 'ko', 'vi', 'ur'].includes(locale)) assert.ok(!/\p{Script=Han}/u.test(value), `${locale}/${key}: untranslated Chinese`);
    }
  }
}

const homeKeys = new Set([...html.matchAll(/data-i18n(?:-aria-label|-alt|-content)?="(h\d+)"/g)].map(match => match[1]));
for (const item of Object.values(assets)) Object.values(item).flat().forEach(key => homeKeys.add(key));
assert.deepEqual([...homeKeys].sort(), sortedKeys(reference.home), 'Every homepage key must be rendered');
const paperKeys = layout.flatMap(block => [block.key, ...(block.rows?.flat() || []), ...(block.description ? [block.description] : [])]);
assert.deepEqual([...paperKeys].sort(), sortedKeys(reference.whitepaper), 'Every whitepaper key must be rendered exactly once');
assert.deepEqual(layout.filter(block => block.type === 'heading' && block.level === 2).map(block => block.number), Array.from({length: 13}, (_, index) => String(index + 1)));
assert.equal(new Set(layout.filter(block => block.id).map(block => block.id)).size, 53, 'Unique stable section anchors');
assert.deepEqual(layout.filter(block => block.type === 'table').map(block => [block.rows.length, block.rows[0].length]), [[5, 3], [6, 4], [7, 3]]);
const figures = layout.filter(block => block.type === 'figure');
assert.equal(figures.length, 2);
for (const figure of figures) assert.ok(existsSync(new URL('../dist' + figure.src, import.meta.url)));

// Values checked against the original V1.1 PDF. These checks catch silent numeric drift.
const numeric = {
  w023: ['0', '12'], w024: ['12', '24'], w025: ['24'],
  w056: ['2'], w059: ['7'], w097: ['2'],
  w118: ['30'], w119: ['4', '12'], w122: ['30'], w123: ['5'],
  w126: ['15'], w127: ['3', '12'], w130: ['20'], w134: ['5'],
  w135: ['50', '2'], w143: ['1', '3'],
  w205: ['0', '12'], w207: ['12', '24'], w209: ['24', '36'], w211: ['36'],
};
for (const locale of locales) {
  const dict = dictionaries[locale].whitepaper;
  for (const [key, expected] of Object.entries(numeric)) {
    let actual = dict[key].normalize('NFKC').replace(/^\(\d+\)/, '').match(/\d+/g) || [];
    const phase = { w205: '1', w207: '2', w209: '3', w211: '4' }[key];
    if (phase && actual.length === expected.length + 1 && actual[0] === phase) actual = actual.slice(1);
    assert.deepEqual(actual, expected, `${locale}/${key}: numbers`);
  }
  for (const [key, value] of Object.entries({w118:'30%', w122:'30%', w126:'15%', w130:'20%', w134:'5%'})) assert.equal(dict[key], value);
  assert.equal((dict.w138.match(/50%/g) || []).length, 2, `${locale}: fee split`);
  for (const value of ['200', '160', '10', '20', '3', '5']) assert.ok(dict.w047.includes(value), `${locale}: plant/personnel values`);
  for (const term of ['ACP-Gateway', 'RWA', 'DAO', 'veACP', 'Boost']) assert.ok(Object.values(dict).join(' ').includes(term), `${locale}: ${term}`);
}
const initial = JSON.parse(html.match(/<script id="initial-home" type="application\/json">([\s\S]*?)<\/script>/)[1]);
assert.deepEqual(initial, dictionaries['zh-Hant'].home, 'Static initial homepage matches Traditional Chinese resource');
assert.match(html, /<html lang="zh-Hant">/);
const uiSource = read('dist/assets/i18n-ui.js');
const { languages, ui } = await import('data:text/javascript;base64,' + Buffer.from(uiSource).toString('base64'));
assert.deepEqual(languages.map(row => row[0]).sort(), [...locales].sort());
for (const locale of locales) {
  assert.deepEqual(sortedKeys(ui[locale]), sortedKeys(ui['zh-Hant']));
  assert.ok(Object.values(ui[locale]).every(value => typeof value === 'string' && value.trim()));
}
const rewrites = [{source:'/whitepaper', destination:'/index.html'}, {source:'/whitepaper/', destination:'/index.html'}];
assert.deepEqual(json('vercel.json').rewrites, rewrites);
assert.deepEqual(json('serve.json').rewrites, rewrites);
assert.equal(json('vercel.json').outputDirectory, 'dist');
const pdf = readFileSync(new URL('../dist/assets/ACP_Whitepaper_V1.1.pdf', import.meta.url));
assert.equal(createHash('sha256').update(pdf).digest('hex'), '1b8d8ae8fd35227f296f07bc1163d7f3e6ee3a2634c7fbe418cea3bd713d8012', 'Original PDF must remain unchanged');
console.log('PASS: 6 locales × (193 homepage + 233 whitepaper keys), 53 sections / 13 chapters, 3 tables, 2 figures, numeric invariants, original PDF, initial language and routes.');
