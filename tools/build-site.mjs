/* Regenerează local ce scrie /api/publish (server/api.js → buildEntries),
   fără GitHub și fără panou: products.js, content.js, data/posts.json,
   index.html, 404.html și sitemap.xml, cu aceleași funcții de randare.

   Rulare:   node tools/build-site.mjs           (scrie fișierele)
             node tools/build-site.mjs --check   (nu scrie; iese cu 1 dacă ar schimba ceva)

   Idempotent: rulat pe un repo deja generat nu schimbă nimic. Pozele nu
   se ating (le gestionează panoul). */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseConsts, renderProductsJs, renderContentJs, renderPostsJson, renderIndex,
  renderNotFound, renderSitemap, siteInfo, sortPosts,
} from '../server/render.js';

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
const { site, ver } = siteInfo(indexHtml);

const outputs = {
  'assets/js/products.js': productsJs,
  'assets/js/content.js': contentJs,
  'data/posts.json': renderPostsJson(posts),
  'index.html': renderIndex(indexHtml, { content, productsJs, contentJs }),
  '404.html': renderNotFound({ site, ver }),
  'sitemap.xml': renderSitemap({ site }),
};

const changed = [];
for (const [path, text] of Object.entries(outputs)) {
  const full = join(root, path);
  const before = existsSync(full) ? readFileSync(full, 'utf8') : null;
  if (before === text) continue;
  changed.push(`${path}${before === null ? ' (nou)' : ''}`);
  if (!check) { mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, text); }
}

if (!changed.length) console.log('Nimic de schimbat: fișierele sunt la zi.');
else console.log(`${check ? 'S-ar schimba' : 'Scris'}: ${changed.join(', ')}`);
console.log(`${products.length} genți, ${posts.length} articole.`);
if (check && changed.length) process.exit(1);
