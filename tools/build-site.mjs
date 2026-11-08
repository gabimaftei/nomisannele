/* Regenerează local ce scrie /api/publish (server/api.js → buildEntries),
   fără GitHub și fără panou: products.js, content.js, data/posts.json,
   index.html, en/index.html, paginile de geantă și de articol (genti/, blog/,
   en/…), 404.html, sitemap.xml și robots.txt, cu aceleași funcții de randare.
   Paginile unei genți sau ale unui articol dispărut se șterg.

   Rulare:   node tools/build-site.mjs           (scrie fișierele)
             node tools/build-site.mjs --check   (nu scrie; iese cu 1 dacă ar schimba ceva)

   Idempotent: rulat pe un repo deja generat nu schimbă nimic. Pozele nu
   se ating (le gestionează panoul). */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, rmdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseConsts, renderProductsJs, renderContentJs, renderPostsJson, sortPosts,
} from '../server/render.js';
import { buildSiteFiles, stalePages, GENERATED_PAGE } from '../server/render-bags.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const read = (p) => readFileSync(join(root, p), 'utf8');

const { PRODUCTS: products } = parseConsts(read('assets/js/products.js'), ['PRODUCTS']);
const { CONTENT: content } = parseConsts(read('assets/js/content.js'), ['CONTENT']);
const postsPath = join(root, 'data/posts.json');
const posts = sortPosts(existsSync(postsPath) ? (JSON.parse(read('data/posts.json')).posts || []) : []);
const indexHtml = read('index.html');
const productsJs = renderProductsJs(products);
const contentJs = renderContentJs(content);

/* poza .webp se pomenește în pagini doar dacă există pe disc */
const hasFile = (p) => existsSync(join(root, p));
const pages = buildSiteFiles({ indexHtml, products, content, posts, productsJs, contentJs, hasFile });

const outputs = {
  'assets/js/products.js': productsJs,
  'assets/js/content.js': contentJs,
  'data/posts.json': renderPostsJson(posts),
  ...Object.fromEntries(pages),
};

/* paginile generate care nu mai au geantă sau articol */
const walk = (dir, acc = []) => {
  if (!existsSync(join(root, dir))) return acc;
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) walk(rel, acc); else acc.push(rel);
  }
  return acc;
};
const stale = stalePages([...walk('genti'), ...walk('blog'), ...walk('en')].filter((p) => GENERATED_PAGE.test(p)), pages);

const changed = [];
for (const [path, text] of Object.entries(outputs)) {
  const full = join(root, path);
  const before = existsSync(full) ? readFileSync(full, 'utf8') : null;
  if (before === text) continue;
  changed.push(`${path}${before === null ? ' (nou)' : ''}`);
  if (!check) { mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, text); }
}

for (const path of stale) {
  changed.push(`${path} (șters)`);
  if (!check) {
    unlinkSync(join(root, path));
    try { rmdirSync(dirname(join(root, path))); } catch { /* nu e gol */ }
  }
}

if (!changed.length) console.log('Nimic de schimbat: fișierele sunt la zi.');
else console.log(`${check ? 'S-ar schimba' : 'Scris'}: ${changed.join(', ')}`);
console.log(`${products.length} genți, ${posts.length} articole.`);
if (check && changed.length) process.exit(1);
