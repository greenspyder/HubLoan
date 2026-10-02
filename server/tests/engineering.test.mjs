import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../store.mjs';
import { createApp } from '../app.mjs';
import { createEngineeringProvider, validateEdits } from '../engineering.mjs';
import { workspaceId, encryptKey } from '../domain.mjs';
const token = 'a'.repeat(64), id = workspaceId(token), masterKey = 'b'.repeat(64), githubKey = 'github_pat_' + 'c'.repeat(50), aiKey = 'fixture-ai-private';
const file = 'docs/ONBOARDING.md', baseSha = 'd'.repeat(40), headSha = 'e'.repeat(40);
async function fixture(t, options = {}) {
  const store = await createStore({ file: ':memory:' }), calls = [], publications = [];
  const engineeringProvider = { connect: async () => ({}), source: async () => ({ baseSha, treeSha: 'f'.repeat(40), sources: { [file]: null } }), publish: async (key, job, patch) => { assert.equal(key, githubKey); publications.push({ job, patch }); return { headSha, prNumber: 1, prUrl: 'https://github.com/greenspyder/HubLoan/pull/1' }; }, checks: async () => ({ status: 'unknown', note: 'No CI' }), ...options };
  const provider = { text: async (key, model, instructions, input) => { assert.equal(key, aiKey); calls.push({ instructions, input }); const output = calls.length % 3 === 1 ? 'Plano pequeno' : calls.length % 3 === 2 ? JSON.stringify({ summary: 'Guia de ativação', edits: [{ path: file, before: '', after: '# Começar\nUse limites de chamadas e custos reais.' }] }) : JSON.stringify({ approved: true, reason: 'Texto no escopo.' }); return { output }; } };
  const app = createApp({ store, provider, masterKey, engineeringProvider }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  t.after(async () => { await app.close(); await store.close(); });
  await store.mutate(id, w => { w.secret = encryptKey(aiKey, token); });
  async function call(path, input, access = token, method = input ? 'POST' : 'GET') { const r = await fetch(`http://127.0.0.1:${app.server.address().port}/api/agents${path}`, { method, headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' }, body: input ? JSON.stringify(input) : undefined }); return { status: r.status, data: await r.json() }; }
  async function start(enabled = false) { assert.equal((await call('/engineering/connect', { apiKey: githubKey, authorize: true })).status, 200); assert.equal((await call('/engineering/configure', { enabled, maxJobs: 1, maxCalls: 3 })).status, 200); }
  return { store, app, calls, publications, provider, call, start };
}
test('manual proposal reserves three calls, separates review from tests and isolates credentials/tenants', async t => {
  const f = await fixture(t); await f.start(); const queued = await f.call('/engineering/jobs', { taskId: 'onboarding-guide' }); assert.equal(queued.status, 201); assert.equal(queued.data.engineering.usedCalls, 3);
  await Promise.all([f.app.engineering.tick(), f.app.engineering.tick()]); assert.equal(f.calls.length, 3); assert.equal(f.publications.length, 1);
  const w = (await f.call('/workspace')).data, job = w.engineering.jobs[0]; assert.equal(job.status, 'proposed'); assert.equal(job.review.testsExecuted, false); assert.equal(job.checks.status, 'unknown');
  assert.ok(!JSON.stringify(w).includes(githubKey)); assert.ok(!JSON.stringify(w).includes(aiKey)); assert.ok(!JSON.stringify(f.calls).includes(githubKey)); assert.ok(!JSON.stringify(f.calls).includes(token));
  assert.equal((await f.call(`/engineering/jobs/${job.id}/checks`, {}, '9'.repeat(64))).status, 400); assert.equal((await f.call(`/engineering/jobs/${job.id}/checks`, {})).status, 200);
  await f.app.engineering.tick(); assert.equal(f.calls.length, 3); assert.equal((await f.call('/engineering/jobs', { taskId: 'budget-summary' })).status, 409);
});
test('rejected reviewer never publishes; model failures never repeat automatically', async t => {
  const f = await fixture(t); await f.start(); let n = 0; f.provider.text = async () => ({ output: ++n === 1 ? 'Plano' : n === 2 ? JSON.stringify({ summary: 'Guia', edits: [{ path: file, before: '', after: '# Guia' }] }) : JSON.stringify({ approved: false, reason: 'Incompleto' }) });
  await f.call('/engineering/jobs', { taskId: 'onboarding-guide' }); await f.app.engineering.tick(); assert.equal(f.publications.length, 0); assert.equal((await f.call('/workspace')).data.engineering.jobs[0].status, 'failed'); await f.app.engineering.tick(); assert.equal(n, 3);
});
test('uncertain GitHub operation permanently blocks renewal and automatic retries', async t => {
  const f = await fixture(t, { publish: async () => { throw new Error(githubKey); } }); await f.start(); await f.call('/engineering/jobs', { taskId: 'onboarding-guide' }); await f.app.engineering.tick();
  const e = (await f.call('/workspace')).data.engineering; assert.equal(e.jobs[0].status, 'uncertain'); assert.ok(!JSON.stringify(e).includes(githubKey)); assert.equal(e.enabled, false);
  assert.equal((await f.call('/engineering/configure', { enabled: true, maxJobs: 3, maxCalls: 9 })).status, 409); await f.app.engineering.tick(); assert.equal(f.calls.length, 3);
});
test('pause revokes queued proposals and requires new authorization', async t => {
  const f = await fixture(t); await f.start(); await f.call('/engineering/jobs', { taskId: 'onboarding-guide' }); await f.call('/engineering/pause', {}); await f.app.engineering.tick(); assert.equal(f.calls.length, 0); assert.equal((await f.call('/engineering/jobs', { taskId: 'budget-summary' })).status, 400);
});
test('crashed running proposal recovers without resend; missing keys and protected tasks rejected', async t => {
  const f = await fixture(t); await f.start(); await f.call('/engineering/jobs', { taskId: 'onboarding-guide' }); await f.store.mutate(id, w => { w.engineering.jobs[0].status = 'running'; w.engineering.jobs[0].leaseUntil = 0; }); await f.app.engineering.tick(); assert.equal((await f.call('/workspace')).data.engineering.jobs[0].status, 'uncertain'); assert.equal(f.calls.length, 0);
  assert.equal((await f.call('/engineering/jobs', { taskId: '../../server/app.mjs' })).status, 400);
});
test('patch validation rejects protected paths, new network/storage/secrets, ambiguous replacements and no-op', () => {
  const encode = (path, before, after) => JSON.stringify({ summary: 'Change', edits: [{ path, before, after }] });
  for (const path of ['server/app.mjs', '.github/workflows/agent-checks.yml', '../docs/ONBOARDING.md', 'frontend/package.json']) assert.throws(() => validateEdits(encode(path, '', 'x'), { [file]: null }, [file]));
  for (const after of ['fetch("x")', 'localStorage.getItem("x")', githubKey, 'eval("x")', 'import("x")', 'https://example.com']) assert.throws(() => validateEdits(encode(file, '', after), { [file]: null }, [file]));
  assert.throws(() => validateEdits(encode(file, 'a', 'b'), { [file]: 'aa' }, [file])); assert.throws(() => validateEdits(encode(file, 'a', 'a'), { [file]: 'a' }, [file]));
  assert.equal(validateEdits(encode(file, 'a', 'b'), { [file]: 'cat' }, [file]).files[file], 'cbt');
});
test('GitHub publication preserves tree and creates only a draft PR branch; changed base blocks writes', async () => {
  const requests = []; let changed = false;
  const provider = createEngineeringProvider(async (url, options) => { assert.ok(url.startsWith('https://api.github.com/repos/greenspyder/HubLoan')); assert.equal(options.redirect, 'error'); const body = options.body && JSON.parse(options.body); requests.push({ url, ...options, body }); let data;
    if (url.endsWith('/git/ref/heads/master')) data = { object: { sha: changed ? headSha : baseSha } };
    else if (url.includes('/git/ref/heads/hubloan/')) return new Response('', { status: 404 });
    else if (url.endsWith('/git/trees')) { assert.equal(body.base_tree, 'f'.repeat(40)); data = { sha: '1'.repeat(40) }; }
    else if (url.endsWith('/git/commits')) { assert.deepEqual(body.parents, [baseSha]); data = { sha: headSha }; }
    else if (url.endsWith('/git/refs')) { assert.ok(body.ref.startsWith('refs/heads/hubloan/ai-')); data = {}; }
    else if (url.endsWith('/pulls')) { assert.equal(body.base, 'master'); assert.equal(body.draft, true); data = { number: 1, draft: true, html_url: 'https://github.com/greenspyder/HubLoan/pull/1', head: { sha: headSha } }; }
    return Response.json(data);
  });
  const job = { branch: 'hubloan/ai-' + '12345678-1234-1234-1234-123456789012', title: 'Guia' }, patch = { summary: 'Guia', files: { [file]: '# Guia' } }, source = { baseSha, treeSha: 'f'.repeat(40) };
  await provider.publish(githubKey, job, patch, source); assert.equal(requests.filter(r => r.method === 'POST').length, 4); assert.ok(!requests.some(r => ['PATCH', 'DELETE'].includes(r.method)));
  changed = true; const before = requests.length; await assert.rejects(provider.publish(githubKey, job, patch, source), /principal mudou/); assert.equal(requests.length, before + 1);
});
test('CI requires actual GitHub Actions workflow and exact head, never an unrelated green check', async () => {
  let correct = false;
  const provider = createEngineeringProvider(async url => Response.json(url.includes('/pulls/') ? { head: { sha: headSha }, state: 'open' } : url.includes('/actions/runs') ? { workflow_runs: [{ name: 'Agent checks', path: '.github/workflows/agent-checks.yml', head_sha: headSha, check_suite_id: 7 }] } : { check_runs: [{ id: 1, name: 'verify', head_sha: headSha, status: 'completed', conclusion: 'success', app: { slug: 'github-actions' }, check_suite: { id: correct ? 7 : 8 } }] }));
  assert.equal((await provider.checks(githubKey, { prNumber: 1, headSha })).status, 'unknown'); correct = true; assert.equal((await provider.checks(githubKey, { prNumber: 1, headSha })).status, 'passed');
  await assert.rejects(provider.checks(githubKey, { prNumber: 1, headSha: baseSha }), /PR mudou/);
});
test('uncertain acknowledgement permits other tasks without resending original', async t => {
  const f = await fixture(t, { publish: async () => { throw new Error('timeout'); } }); await f.start(); await f.call('/engineering/jobs', { taskId: 'onboarding-guide' }); await f.app.engineering.tick(); const j = (await f.call('/workspace')).data.engineering.jobs[0];
  assert.equal((await f.call(`/engineering/jobs/${j.id}/acknowledge`, { checked: false })).status, 400); assert.equal((await f.call(`/engineering/jobs/${j.id}/acknowledge`, { checked: true })).status, 200);
  assert.equal((await f.call('/engineering/configure', { enabled: false, maxJobs: 1, maxCalls: 3 })).status, 200); assert.equal((await f.call('/engineering/jobs', { taskId: 'onboarding-guide' })).status, 409); assert.equal((await f.call('/engineering/jobs', { taskId: 'budget-summary' })).status, 201);
});
test('encrypted GitHub grant and queued proposal survive durable restart', async t => {
  const { mkdtemp, rm } = await import('node:fs/promises'), { tmpdir } = await import('node:os'), { join } = await import('node:path'), { createEngineering } = await import('../engineering.mjs');
  const folder = await mkdtemp(join(tmpdir(), 'engineering-')); t.after(() => rm(folder, { recursive: true, force: true }));
  let store = await createStore({ file: join(folder, 'db.sqlite') }); const external = { connect: async () => ({}), source: async () => { throw new Error('do not resend'); } };
  let worker = createEngineering(store, {}, { masterKey, provider: external }); await store.mutate(id, w => { w.secret = encryptKey(aiKey, token); }); await worker.connect(id, { apiKey: githubKey, authorize: true }); await worker.configure(id, token, { enabled: false, maxJobs: 1, maxCalls: 3 }); await worker.enqueue(id, 'onboarding-guide');
  await worker.close(); await store.close(); store = await createStore({ file: join(folder, 'db.sqlite') }); worker = createEngineering(store, {}, { masterKey, provider: external }); t.after(async () => { await worker.close(); await store.close(); });
  const raw = (await store.read(id)).workspace; assert.ok(!JSON.stringify(raw).includes(githubKey)); assert.ok(!JSON.stringify(raw.engineering).includes(token)); assert.equal((await store.engineeringSpaces()).length, 1); await worker.tick(); assert.equal((await store.read(id)).workspace.engineering.jobs[0].status, 'failed');
});
test('owner approval is explicit, bound to both SHAs, isolated and single use under concurrency', async t => {
  let merges = 0;
  const f = await fixture(t, { prepareMerge: async () => ({}), merge: async () => { merges++; return { mergeSha: '1'.repeat(40) }; }, deployment: async () => ({ mergeSha: '1'.repeat(40), deployment: { vercel: 'success', backend: 'unknown', note: 'Frontend only' } }) });
  await f.start(); await f.call('/engineering/jobs', { taskId: 'onboarding-guide' }); await f.app.engineering.tick(); const j = (await f.call('/workspace')).data.engineering.jobs[0];
  const approval = { approve: true, headSha: j.headSha, baseSha: j.baseSha }, path = `/engineering/jobs/${j.id}/approve`;
  for (const input of [{ ...approval, approve: false }, { ...approval, headSha: baseSha }, { ...approval, baseSha: headSha }]) assert.equal((await f.call(path, input)).status, 409);
  assert.equal((await f.call(path, approval, '9'.repeat(64))).status, 409);
  await Promise.all([f.call(path, approval), f.call(path, approval)]); assert.equal(merges, 1);
  const release = (await f.call('/workspace')).data.engineering.jobs[0].release; assert.equal(release.status, 'merged'); assert.equal(release.headSha, headSha); assert.equal(release.deployment.vercel, 'pending'); assert.equal((await f.call(path, approval)).status, 409);
  const synced = await f.call(`/engineering/jobs/${j.id}/deployment`, {}); assert.equal(synced.data.engineering.jobs[0].release.deployment.vercel, 'success'); assert.equal(synced.data.engineering.jobs[0].release.deployment.backend, 'unknown'); assert.equal(f.calls.length, 3);
});
test('failed CI never records approval; ambiguous merge is reconciled read-only without repeat', async t => {
  let failChecks = true, merges = 0;
  const f = await fixture(t, { prepareMerge: async () => { if (failChecks) throw new (await import('../domain.mjs')).AppError('CI failed', 409); return {}; }, merge: async () => { merges++; throw new Error(githubKey); }, deployment: async () => ({ mergeSha: '1'.repeat(40), deployment: { vercel: 'pending', backend: 'unknown', note: 'Pending' } }) });
  await f.start(); await f.call('/engineering/jobs', { taskId: 'onboarding-guide' }); await f.app.engineering.tick(); const j = (await f.call('/workspace')).data.engineering.jobs[0], body = { approve: true, headSha, baseSha }, path = `/engineering/jobs/${j.id}/approve`;
  assert.equal((await f.call(path, body)).status, 409); assert.equal(merges, 0); assert.equal((await f.call('/workspace')).data.engineering.jobs[0].release, undefined);
  failChecks = false; const uncertain = await f.call(path, body); assert.equal(uncertain.data.engineering.jobs[0].release.status, 'uncertain'); assert.ok(!JSON.stringify(uncertain.data).includes(githubKey)); await f.app.engineering.tick(); assert.equal(merges, 1); assert.equal((await f.call(path, body)).status, 409);
  await f.call(`/engineering/jobs/${j.id}/deployment`, {}); assert.equal((await f.call('/workspace')).data.engineering.jobs[0].release.status, 'merged'); assert.equal(merges, 1);
});
test('GitHub merge revalidates exact files, commits and CI before ready/merge with SHA guard', async () => {
  const writes = []; let head = headSha, ci = true, content = '# Guia', master = baseSha, extra = false, draft = true;
  const job = { branch: 'hubloan/ai-12345678-1234-1234-1234-123456789012', prNumber: 1, headSha, baseSha, taskId: 'onboarding-guide', title: 'Guia', review: { approved: true }, edits: [{ path: file, before: '', after: '# Guia' }] };
  const provider = createEngineeringProvider(async (url, opts) => {
    let data; if (opts.method !== 'GET') writes.push({ url, body: JSON.parse(opts.body) });
    if (url.endsWith('/graphql')) { draft = false; data = { data: { markPullRequestReadyForReview: { pullRequest: { isDraft: false, headRefOid: headSha } } } }; }
    else if (url.endsWith('/merge')) data = { merged: true, sha: '1'.repeat(40) };
    else if (url.endsWith('/pulls/1')) data = { head: { sha: head, ref: job.branch, repo: { full_name: 'greenspyder/HubLoan' } }, base: { sha: baseSha, ref: 'master', repo: { full_name: 'greenspyder/HubLoan' } }, state: 'open', merged: false, mergeable: true, draft, node_id: 'PR_fixture', changed_files: extra ? 2 : 1 };
    else if (url.includes('/pulls/1/files')) data = [{ filename: file, status: 'added' }, ...(extra ? [{ filename: 'server/app.mjs', status: 'modified' }] : [])];
    else if (url.includes('/git/ref/heads/master')) data = { object: { sha: master } };
    else if (url.includes('/git/commits/')) data = { tree: { sha: 'f'.repeat(40) } };
    else if (url.includes('/contents/')) { if (url.endsWith(`ref=${baseSha}`)) return new Response('', { status: 404 }); data = { type: 'file', encoding: 'base64', content: Buffer.from(content).toString('base64') }; }
    else if (url.includes('/actions/runs')) data = { workflow_runs: [{ name: 'Agent checks', path: '.github/workflows/agent-checks.yml', head_sha: headSha, check_suite_id: 7 }] };
    else if (url.includes('/check-runs')) data = { check_runs: [{ name: 'verify', id: 1, head_sha: headSha, status: 'completed', conclusion: ci ? 'success' : 'failure', app: { slug: 'github-actions' }, check_suite: { id: 7 } }] };
    return Response.json(data);
  });
  head = baseSha; await assert.rejects(provider.prepareMerge(githubKey, job)); head = headSha;
  master = headSha; await assert.rejects(provider.prepareMerge(githubKey, job)); master = baseSha;
  extra = true; await assert.rejects(provider.prepareMerge(githubKey, job)); extra = false;
  content = 'changed'; await assert.rejects(provider.prepareMerge(githubKey, job)); content = '# Guia';
  ci = false; await assert.rejects(provider.prepareMerge(githubKey, job)); ci = true; assert.equal(writes.length, 0);
  const prepared = await provider.prepareMerge(githubKey, job); await provider.merge(githubKey, job, prepared);
  assert.equal(writes.length, 2); assert.equal(writes[0].url, 'https://api.github.com/graphql'); assert.deepEqual(writes[1].body, { sha: headSha, merge_method: 'squash', commit_title: 'Approved AI proposal: Guia' });
});
