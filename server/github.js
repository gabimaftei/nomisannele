/* ═══════════════════════════════════════════════════════════════
   Discuția cu GitHub
   ───────────────────────────────────────────────────────────────
   Tokenul stă doar aici, pe server, ca secret (GITHUB_TOKEN). Panoul
   din browser nu-l vede niciodată.

   GITHUB_API_URL, GITHUB_REPO și GITHUB_BRANCH se pot suprascrie din
   mediu — în special pentru testele locale, ca Worker-ul să vorbească
   cu un GitHub simulat în loc de cel real. Implicit: api.github.com.
   ═══════════════════════════════════════════════════════════════ */

const API = 'https://api.github.com';
const REPO = 'gabimaftei/nomisannele';
const BRANCH = 'main';

export function repoOf(env) { return env.GITHUB_REPO || REPO; }
export function branchOf(env) { return env.GITHUB_BRANCH || BRANCH; }
export function apiOf(env) { return (env.GITHUB_API_URL || API).replace(/\/+$/, ''); }

export async function gh(env, path, init = {}) {
  const r = await fetch(apiOf(env) + path, {
    ...init,
    headers: {
      authorization: 'Bearer ' + env.GITHUB_TOKEN,
      accept: 'application/vnd.github+json',
      'user-agent': 'nomis-annele-admin',
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!r.ok) {
    const text = await r.text();
    const err = new Error(`GitHub ${path} → ${r.status}: ${text.slice(0, 300)}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

/* Unde e acum ramura principală: commit-ul și arborele lui. */
export async function readHead(env) {
  const repo = repoOf(env);
  const ref = await gh(env, `/repos/${repo}/git/ref/heads/${branchOf(env)}`);
  const commit = await gh(env, `/repos/${repo}/git/commits/${ref.object.sha}`);
  return { commit: ref.object.sha, tree: commit.tree.sha };
}

/* Toate fișierele din repo, cu amprenta fiecăruia: cale → sha. */
export async function listFiles(env, treeSha) {
  const t = await gh(env, `/repos/${repoOf(env)}/git/trees/${treeSha}?recursive=1`);
  if (t.truncated) throw new Error('Repo-ul are prea multe fișiere pentru o citire completă.');
  const files = new Map();
  for (const e of t.tree) if (e.type === 'blob') files.set(e.path, e.sha);
  return files;
}

function b64ToText(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* Conținutul unui fișier text, sau null dacă nu există. */
export async function readText(env, files, path) {
  const sha = files.get(path);
  if (!sha) return null;
  const blob = await gh(env, `/repos/${repoOf(env)}/git/blobs/${sha}`);
  return b64ToText(blob.content);
}

export async function createBlob(env, base64) {
  const b = await gh(env, `/repos/${repoOf(env)}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify({ content: base64, encoding: 'base64' }),
  });
  return b.sha;
}

/* Un singur commit cu toate schimbările. Actualizarea ramurii NU e forțată:
   dacă între timp a apărut alt commit, GitHub o refuză, și nu suprascriem
   nimic din ce a publicat altcineva. */
export async function commitTree(env, head, entries, message) {
  const repo = repoOf(env);
  const tree = await gh(env, `/repos/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: head.tree, tree: entries }),
  });
  const commit = await gh(env, `/repos/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [head.commit] }),
  });
  await gh(env, `/repos/${repo}/git/refs/heads/${branchOf(env)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  return commit.sha;
}
