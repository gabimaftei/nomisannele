/* GitHub simulat: partea de API folosită în server/github.js, în memorie.

     GET   /repos/:o/:r/git/ref/heads/:branch
     GET   /repos/:o/:r/git/commits/:sha
     GET   /repos/:o/:r/git/trees/:sha?recursive=1
     GET   /repos/:o/:r/git/blobs/:sha
     POST  /repos/:o/:r/git/blobs | trees | commits
     PATCH /repos/:o/:r/git/refs/heads/:branch   (non-fast-forward → 422)

   Pornește dintr-o COPIE a fișierelor repo-ului (git ls-files + fișierele
   nefolosite încă în git, fără .git real). Nu scrie nimic pe disc, nici în
   repo, nici în altă parte: starea e doar în memorie. Nu folosește rețeaua
   în afară de portul local. NU înlocuiește GitHub: nu verifică permisiuni,
   limite, dimensiuni sau paginare.

   Rulare directă:  node tools/mock-github.mjs [port]   (port 0 = unul liber) */
import http from 'node:http';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sha1 = (...parts) => {
  const h = crypto.createHash('sha1');
  for (const p of parts) h.update(p);
  return h.digest('hex');
};
const blobSha = (buf) => sha1(`blob ${buf.length}\0`, buf);

export const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* cale → Buffer, pentru fișierele repo-ului (urmărite + noi, fără ce ignoră .gitignore) */
export function repoFiles(root = DEFAULT_ROOT) {
  const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root })
    .toString('utf8').split('\0').filter(Boolean);
  const files = new Map();
  for (const p of out) {
    const full = join(root, p);
    if (existsSync(full)) files.set(p, readFileSync(full));
  }
  return files;
}

export async function startMockGithub({ files = repoFiles(), branch = 'main', port = 0 } = {}) {
  const blobs = new Map();      // sha → Buffer
  const trees = new Map();      // sha → Map(path → blob sha)
  const commits = new Map();    // sha → { tree, parents, message }
  const putBlob = (buf) => { const sha = blobSha(buf); blobs.set(sha, buf); return sha; };
  const putTree = (map) => {
    const sha = sha1('tree ' + JSON.stringify([...map].sort()));
    trees.set(sha, map);
    return sha;
  };
  const putCommit = (tree, parents, message) => {
    const sha = sha1('commit', JSON.stringify([tree, parents, message, crypto.randomUUID()]));
    commits.set(sha, { tree, parents, message });
    return sha;
  };

  const initial = new Map();
  for (const [p, buf] of files) initial.set(p, putBlob(Buffer.isBuffer(buf) ? buf : Buffer.from(buf)));
  let head = putCommit(putTree(initial), [], 'Stare inițială');
  const state = {
    requests: [],               // { method, path } pentru fiecare cerere
    beforePatch: null,          // cârlig: funcție apelată chiar înainte de PATCH ref
  };

  const isAncestor = (anc, from) => {
    const seen = new Set();
    const stack = [from];
    while (stack.length) {
      const c = stack.pop();
      if (c === anc) return true;
      if (seen.has(c) || !commits.has(c)) continue;
      seen.add(c);
      stack.push(...commits.get(c).parents);
    }
    return false;
  };

  const send = (res, status, obj) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(obj));
  };

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://mock');
    state.requests.push({ method: req.method, path: u.pathname });
    const chunks = [];
    for await (const c of req) chunks.push(c);
    let body = null;
    if (chunks.length) {
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { return send(res, 400, { message: 'Problems parsing JSON' }); }
    }
    if (!/^Bearer .+/.test(req.headers.authorization || '')) return send(res, 401, { message: 'Requires authentication' });

    const m = /^\/repos\/[^/]+\/[^/]+(\/.*)$/.exec(u.pathname);
    if (!m) return send(res, 404, { message: 'Not Found' });
    const p = m[1];
    const method = req.method;
    let g;

    if (method === 'GET' && p === `/git/ref/heads/${branch}`) {
      return send(res, 200, { ref: `refs/heads/${branch}`, object: { sha: head, type: 'commit' } });
    }
    if (method === 'GET' && (g = /^\/git\/commits\/([0-9a-f]{40})$/.exec(p))) {
      const c = commits.get(g[1]);
      if (!c) return send(res, 404, { message: 'Not Found' });
      return send(res, 200, { sha: g[1], tree: { sha: c.tree }, parents: c.parents.map((sha) => ({ sha })), message: c.message });
    }
    if (method === 'GET' && (g = /^\/git\/trees\/([0-9a-f]{40})$/.exec(p))) {
      const t = trees.get(g[1]);
      if (!t) return send(res, 404, { message: 'Not Found' });
      return send(res, 200, {
        sha: g[1], truncated: false,
        tree: [...t].map(([path, sha]) => ({ path, mode: '100644', type: 'blob', sha, size: blobs.get(sha).length })),
      });
    }
    if (method === 'GET' && (g = /^\/git\/blobs\/([0-9a-f]{40})$/.exec(p))) {
      const b = blobs.get(g[1]);
      if (!b) return send(res, 404, { message: 'Not Found' });
      return send(res, 200, { sha: g[1], encoding: 'base64', size: b.length, content: b.toString('base64') });
    }
    if (method === 'POST' && p === '/git/blobs') {
      if (!body || typeof body.content !== 'string') return send(res, 422, { message: 'Invalid request: content' });
      const buf = body.encoding === 'base64' ? Buffer.from(body.content, 'base64') : Buffer.from(body.content, 'utf8');
      return send(res, 201, { sha: putBlob(buf) });
    }
    if (method === 'POST' && p === '/git/trees') {
      if (!body || !Array.isArray(body.tree)) return send(res, 422, { message: 'Invalid request: tree' });
      let base = new Map();
      if (body.base_tree) {
        if (!trees.has(body.base_tree)) return send(res, 404, { message: 'Not Found' });
        base = new Map(trees.get(body.base_tree));
      }
      for (const e of body.tree) {
        if (typeof e.path !== 'string' || !e.path || e.path.startsWith('/') || e.path.includes('..')) {
          return send(res, 422, { message: 'tree.path is invalid' });
        }
        if (e.sha === null) { base.delete(e.path); continue; }
        if (typeof e.content === 'string') base.set(e.path, putBlob(Buffer.from(e.content, 'utf8')));
        else if (typeof e.sha === 'string' && blobs.has(e.sha)) base.set(e.path, e.sha);
        else return send(res, 422, { message: `tree.sha for ${e.path} does not exist` });
      }
      return send(res, 201, { sha: putTree(base) });
    }
    if (method === 'POST' && p === '/git/commits') {
      if (!body || !trees.has(body.tree) || !Array.isArray(body.parents) || !body.parents.every((x) => commits.has(x))) {
        return send(res, 422, { message: 'Invalid commit: tree or parents does not exist' });
      }
      return send(res, 201, { sha: putCommit(body.tree, body.parents, String(body.message || '')) });
    }
    if (method === 'PATCH' && p === `/git/refs/heads/${branch}`) {
      if (state.beforePatch) { const f = state.beforePatch; state.beforePatch = null; f(); }
      if (!body || !commits.has(body.sha)) return send(res, 422, { message: 'Object does not exist' });
      if (!body.force && !isAncestor(head, body.sha)) return send(res, 422, { message: 'Update is not a fast forward' });
      head = body.sha;
      return send(res, 200, { ref: `refs/heads/${branch}`, object: { sha: head, type: 'commit' } });
    }
    return send(res, 404, { message: 'Not Found' });
  });

  await new Promise((ok, no) => { server.once('error', no); server.listen(port, '127.0.0.1', ok); });
  const url = `http://127.0.0.1:${server.address().port}`;

  const api = {
    url, branch, state,
    get head() { return head; },
    get log() { const out = []; let c = head; while (c && commits.has(c)) { out.push({ sha: c, ...commits.get(c) }); c = commits.get(c).parents[0]; } return out; },
    /* fișierele la HEAD: cale → Buffer */
    filesAtHead() { return new Map([...trees.get(commits.get(head).tree)].map(([p, s]) => [p, blobs.get(s)])); },
    readFile(path) { const s = trees.get(commits.get(head).tree).get(path); return s ? blobs.get(s) : null; },
    readText(path) { const b = api.readFile(path); return b ? b.toString('utf8') : null; },
    /* un commit venit „din alt loc" (ca să se simuleze o cursă) */
    advance(path = 'nota-din-alt-loc.txt', text = 'altcineva') {
      const t = new Map(trees.get(commits.get(head).tree));
      t.set(path, putBlob(Buffer.from(text)));
      head = putCommit(putTree(t), [head], 'Commit din altă parte');
      return head;
    },
    env: { GITHUB_API_URL: url, GITHUB_REPO: 'test/nomis', GITHUB_BRANCH: branch, GITHUB_TOKEN: 'token-fals-de-test' },
    async close() { server.closeAllConnections?.(); await new Promise((ok) => server.close(ok)); },
  };
  return api;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const mock = await startMockGithub({ port: Number(process.argv[2] || 0) });
  console.log(`GitHub simulat pe ${mock.url} (în memorie, repo-ul real nu e atins). Ctrl+C oprește.`);
  const stop = async () => { await mock.close(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
