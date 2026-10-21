import { languages, ui } from './i18n-ui.js';

const $ = id => document.getElementById(id);
const home = $('home'), paper = $('whitepaper'), footer = document.querySelector('footer');
const initialHome = JSON.parse($('initial-home').textContent);
const requests = new Map([['/locales/home.zh-Hant.json', Promise.resolve(initialHome)]]);
let locale = 'zh-Hant', homeText = initialHome, currentPath = '/', activeAsset = 'component';
let sequence = 0, retryAction = null, activeChapter = null, assets, structure;
let paperReady = false;
const desktopReader = matchMedia('(min-width: 901px)');
desktopReader.addEventListener('change', event => { const toc = paper.querySelector('details'); if (toc) toc.open = event.matches; });

function resource(path) {
  if (!requests.has(path)) requests.set(path, fetch(path, { signal: AbortSignal.timeout(15000) }).then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${path}`);
    return response.json();
  }).catch(error => { requests.delete(path); throw error; }));
  return requests.get(path);
}
function validate(dict, keys) {
  if (!dict || keys.some(key => typeof dict[key] !== 'string' || !dict[key].trim())) throw new Error('Incomplete translation');
}
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function link(text, href, className) {
  const node = el('a', text, className); node.href = href; return node;
}
function closeLanguage(focus = false) {
  $('language-options').hidden = true; $('language-button').setAttribute('aria-expanded', 'false');
  if (focus) $('language-button').focus();
}
function setMenu(open) {
  $('navLinks').classList.toggle('open', open);
  $('menuToggle').setAttribute('aria-expanded', String(open));
  $('menuToggle').setAttribute('aria-label', open ? ui[locale].closeMenu : homeText.h171);
}
function isolateLatin(root) {
  if (locale !== 'ur') return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (!walker.currentNode.parentElement.closest('bdi,script,style,[dir="ltr"]')) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const pattern = /[A-Za-z0-9]+(?:[ .%²×–/+:,_-]*[A-Za-z0-9]+)*[%²]?/g;
    const matches = [...node.textContent.matchAll(pattern)];
    if (!matches.length) continue;
    const fragment = document.createDocumentFragment(); let offset = 0;
    for (const match of matches) {
      fragment.append(document.createTextNode(node.textContent.slice(offset, match.index)));
      const isolated = el('bdi', match[0]); isolated.dir = 'ltr'; fragment.append(isolated);
      offset = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(node.textContent.slice(offset))); node.replaceWith(fragment);
  }
}
function applyHome(dict) {
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = dict[node.dataset.i18n];
  for (const attr of ['aria-label', 'alt', 'content']) for (const node of document.querySelectorAll(`[data-i18n-${attr}]`)) node.setAttribute(attr, dict[node.getAttribute(`data-i18n-${attr}`)]);
  homeText = dict;
  $('language-button').setAttribute('aria-label', ui[locale].language);
  $('language-options').setAttribute('aria-label', ui[locale].language);
  $('language-code').textContent = languages.find(row => row[0] === locale)[1];
  for (const button of $('language-options').querySelectorAll('button')) button.setAttribute('aria-checked', String(button.dataset.locale === locale));
  $('retry-button').textContent = ui[locale].retry;
  setMenu(false);
  if (assets) renderAsset(activeAsset);
  isolateLatin(home); isolateLatin(footer); isolateLatin($('topbar'));
}
function renderAsset(key) {
  activeAsset = key;
  const item = assets[key];
  for (const tab of document.querySelectorAll('.asset-tab')) {
    const selected = tab.dataset.key === key; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
  }
  $('asset-panel').setAttribute('aria-labelledby', `tab-${key}`);
  for (const field of ['eyebrow', 'title', 'copy']) $(`asset-${field}`).textContent = homeText[item[field]];
  $('asset-tags').replaceChildren(...item.tags.map(key => el('span', homeText[key])));
  isolateLatin($('asset-panel'));
}
function buildPaper(dict, lang) {
  const t = ui[lang], fragment = document.createDocumentFragment();
  const hero = el('header', undefined, 'paper-hero wrap'); hero.id = 'whitepaper-top';
  hero.append(el('div', 'ACP / V1.1', 'eyebrow'), el('h1', t.title), el('p', t.subtitle, 'paper-subtitle'), el('p', t.source, 'paper-source'));
  const actions = el('div', undefined, 'paper-actions');
  actions.append(link(t.read, '/whitepaper#chapter-1', 'button button-primary'));
  actions.append(link(t.back, '/', 'button button-ghost'));
  const download = link(t.download, '/assets/ACP_Whitepaper_V1.1.pdf', 'paper-download'); download.download = 'ACP_Whitepaper_V1.1.pdf';
  actions.append(download); hero.append(actions); fragment.append(hero);
  const layout = el('div', undefined, 'paper-layout wrap');
  const side = el('aside', undefined, 'paper-sidebar');
  const details = el('details', undefined, 'paper-toc'); details.open = desktopReader.matches;
  const summary = el('summary', t.contents); details.append(summary);
  const nav = el('nav'); nav.setAttribute('aria-label', t.contents);
  const progressLabel = el('div', undefined, 'paper-progress-label');
  progressLabel.append(el('span', t.progress)); const percent = el('span', '0%'); percent.id = 'reading-percent'; percent.dir = 'ltr'; progressLabel.append(percent);
  const progress = el('progress'); progress.id = 'reading-progress'; progress.max = 100; progress.value = 0; progress.setAttribute('aria-label', t.progress);
  const body = el('article', undefined, 'paper-content'); body.id = 'paper-content';
  for (const block of structure) {
    if (block.type === 'heading') {
      const heading = el(`h${block.level}`); heading.id = block.id;
      heading.append(el('bdi', block.number, 'chapter-number'), document.createTextNode(' ' + dict[block.key])); body.append(heading);
      const a = link(block.number + ' ' + dict[block.key], '/whitepaper#' + block.id);
      a.dataset.chapter = block.id; a.className = block.level === 2 ? 'toc-chapter' : block.level === 3 ? 'toc-subsection' : 'toc-detail'; nav.append(a);
    } else if (block.type === 'table') {
      const hint = el('p', t.tableHint, 'table-hint'); body.append(hint);
      const wrapper = el('div', undefined, 'table-scroll'); wrapper.tabIndex = 0; wrapper.setAttribute('role', 'region'); wrapper.setAttribute('aria-label', dict[block.key]);
      const table = el('table'); table.append(el('caption', dict[block.key]));
      const thead = el('thead'), tbody = el('tbody');
      block.rows.forEach((row, index) => { const tr = el('tr'); row.forEach(key => { const cell = el(index ? 'td' : 'th', dict[key]); if (!index) cell.scope = 'col'; tr.append(cell); }); (index ? tbody : thead).append(tr); });
      table.append(thead, tbody); wrapper.append(table); body.append(wrapper);
    } else if (block.type === 'figure') {
      const figure = el('figure'); const image = el('img'); image.src = block.src; image.alt = dict[block.key]; image.loading = 'lazy'; image.width = block.key === 'w070' ? 2089 : 2048; image.height = block.key === 'w070' ? 1429 : 1386;
      const a = link('', block.src); a.target = '_blank'; a.rel = 'noopener'; a.append(image);
      figure.append(a, el('figcaption', dict[block.key]), el('p', t.figure, 'paper-source'), el('p', dict[block.description], 'figure-description')); body.append(figure);
    } else body.append(el('p', dict[block.key]));
  }
  details.append(nav); side.append(progressLabel, progress, details);
  layout.append(side, body); fragment.append(layout);
  const bottom = el('div', undefined, 'paper-end wrap'); bottom.append(link(t.back, '/', 'button button-ghost'), link(t.top, '/whitepaper#whitepaper-top', 'button button-primary')); fragment.append(bottom);
  return fragment;
}
function chapterAtViewport() {
  if (!paperReady || currentPath !== '/whitepaper') return null;
  let current = null;
  for (const heading of paper.querySelectorAll('h2[id],h3[id],h4[id]')) { if (heading.getBoundingClientRect().top <= 180) current = heading.id; else break; }
  return current;
}
function scrollToHash(hash) {
  if (!hash) { window.scrollTo({ top: 0, behavior: 'instant' }); return; }
  let id; try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
  const target = $(id); if (target && !target.closest('[hidden]')) target.scrollIntoView({ behavior: 'instant', block: 'start' });
}
async function transition(lang, url = new URL(location.href), historyMode = null) {
  const token = ++sequence, destination = url.pathname.replace(/\/$/, '') === '/whitepaper' ? '/whitepaper' : '/';
  const changingLanguage = locale !== lang, oldChapter = changingLanguage ? chapterAtViewport() : null;
  closeLanguage(); $('load-status').hidden = true; $('language-button').setAttribute('aria-busy', 'true');
  try {
    const [dict, assetData, layout, whitepaper] = await Promise.all([
      resource(`/locales/home.${lang}.json`),
      assets || resource('/assets/asset-keys.json'),
      destination === '/whitepaper' ? (structure || resource('/assets/whitepaper-structure.json')) : null,
      destination === '/whitepaper' ? resource(`/locales/whitepaper.${lang}.json`) : null
    ]);
    validate(dict, Object.keys(initialHome));
    if (layout) validate(whitepaper, layout.flatMap(block => [block.key, ...(block.rows?.flat() || []), ...(block.description ? [block.description] : [])]));
    if (token !== sequence) return;
    assets = assetData; if (layout) structure = layout;
    const nextPaper = destination === '/whitepaper' ? buildPaper(whitepaper, lang) : null;
    locale = lang; currentPath = destination;
    if (nextPaper) { paper.replaceChildren(nextPaper); paperReady = true; activeChapter = null; }
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    applyHome(dict);
    if (nextPaper) isolateLatin(paper);
    document.title = destination === '/whitepaper' ? ui[lang].paperTitle : ui[lang].homeTitle;
    document.querySelector('meta[property="og:title"]').content = document.title;
    if (destination === '/whitepaper') for (const meta of document.querySelectorAll('meta[name="description"],meta[property="og:description"]')) meta.content = ui[lang].subtitle;
    home.hidden = destination !== '/'; paper.hidden = destination !== '/whitepaper'; footer.hidden = false;
    for (const a of document.querySelectorAll('#topbar a[href="/whitepaper"],footer a[href="/whitepaper"]')) {
      if (destination === '/whitepaper') a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    }
    document.body.classList.toggle('reading-paper', destination === '/whitepaper');
    if (historyMode === 'push') history.pushState({}, '', url.pathname + url.hash);
    if (oldChapter) scrollToHash('#' + oldChapter); else if (!changingLanguage) scrollToHash(url.hash);
    updateProgress(); retryAction = null;
  } catch (error) {
    if (token !== sequence) return;
    requests.delete(`/locales/home.${lang}.json`);
    requests.delete(`/locales/whitepaper.${lang}.json`);
    console.warn('Unable to load page resources:', error.message);
    $('load-message').textContent = ui[locale].error; $('load-status').hidden = false;
    retryAction = () => transition(lang, url, historyMode);
  } finally { if (token === sequence) $('language-button').removeAttribute('aria-busy'); }
}
function updateProgress() {
  $('topbar').classList.toggle('scrolled', window.scrollY > 8);
  if (currentPath !== '/whitepaper' || !paperReady) return;
  const content = $('paper-content'), top = content.offsetTop;
  const max = Math.max(1, content.offsetHeight - innerHeight + 120);
  const progress = Math.min(100, Math.max(0, Math.round((scrollY - top + 120) / max * 100)));
  $('reading-progress').value = progress; $('reading-percent').textContent = progress + '%';
  const selected = chapterAtViewport();
  if (selected !== activeChapter) { activeChapter = selected; for (const item of paper.querySelectorAll('[data-chapter]')) { if (item.dataset.chapter === selected) item.setAttribute('aria-current', 'location'); else item.removeAttribute('aria-current'); } }
}

for (const [lang, code, name] of languages) {
  const button = el('button'); button.type = 'button'; button.dataset.locale = lang; button.lang = lang; button.dir = lang === 'ur' ? 'rtl' : 'ltr'; button.setAttribute('role', 'menuitemradio'); button.setAttribute('aria-checked', String(lang === locale));
  button.append(el('bdi', code, 'language-short'), document.createTextNode(name));
  button.addEventListener('click', () => { transition(lang); $('language-button').focus(); }); $('language-options').append(button);
}
$('language-button').addEventListener('click', () => { const opening = $('language-options').hidden; setMenu(false); $('language-options').hidden = !opening; $('language-button').setAttribute('aria-expanded', String(opening)); if (opening) $('language-options').querySelector('[aria-checked="true"]').focus(); });
$('language-picker').addEventListener('keydown', event => {
  const buttons = [...$('language-options').querySelectorAll('button')];
  if (event.key === 'Escape') { closeLanguage(true); event.preventDefault(); }
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault(); $('language-options').hidden = false; $('language-button').setAttribute('aria-expanded', 'true');
    const index = buttons.indexOf(document.activeElement); const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length; buttons[next].focus();
  }
});
document.addEventListener('click', event => { if (!$('language-picker').contains(event.target)) closeLanguage(); });
document.addEventListener('focusin', event => { if (!$('language-picker').contains(event.target)) closeLanguage(); });
$('menuToggle').addEventListener('click', () => { closeLanguage(); setMenu($('menuToggle').getAttribute('aria-expanded') !== 'true'); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
document.addEventListener('click', event => {
  const a = event.target.closest('a[href]'); if (!a || a.target || a.hasAttribute('download') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
  const url = new URL(a.href); if (url.origin !== location.origin || !['/', '/whitepaper', '/whitepaper/'].includes(url.pathname)) return;
  event.preventDefault(); setMenu(false);
  const path = url.pathname.replace(/\/$/, '') || '/';
  if (path === currentPath && (path !== '/whitepaper' || paperReady)) { history.pushState({}, '', url.pathname + url.hash); if (innerWidth <= 900) paper.querySelector('details')?.removeAttribute('open'); scrollToHash(url.hash); }
  else transition(locale, url, 'push');
});
window.addEventListener('popstate', () => transition(locale));
window.addEventListener('pageshow', event => { if (event.persisted) transition('zh-Hant'); });
let scrollPending = false;
window.addEventListener('scroll', () => { if (!scrollPending) { scrollPending = true; requestAnimationFrame(() => { updateProgress(); scrollPending = false; }); } }, { passive: true });
window.addEventListener('resize', updateProgress);
$('retry-button').addEventListener('click', () => retryAction?.());
document.querySelectorAll('.asset-tab').forEach((tab, index, list) => {
  tab.addEventListener('click', () => { if (assets) renderAsset(tab.dataset.key); });
  tab.addEventListener('keydown', event => { if (!assets || !['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const delta = ['ArrowDown', locale === 'ur' ? 'ArrowLeft' : 'ArrowRight'].includes(event.key) ? 1 : -1; const next = event.key === 'Home' ? list[0] : event.key === 'End' ? list[list.length - 1] : list[(index + delta + list.length) % list.length]; renderAsset(next.dataset.key); next.focus(); });
});
$('year').textContent = new Date().getFullYear();
document.querySelectorAll('.reveal').forEach(node => node.classList.add('visible'));
if (location.pathname.replace(/\/$/, '') === '/whitepaper') { home.hidden = true; footer.hidden = true; paper.hidden = false; paper.append(el('p', ui[locale].loading, 'paper-loading wrap')); }
transition('zh-Hant');
