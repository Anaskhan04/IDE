import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  checkoutBranchSafe,
  discardFileChanges,
  fetchFromRemote,
  formatGitError,
  getAheadBehindCounts,
  parseGitStatusPorcelain,
  runGit,
} from '../vite-git-utils.js';

describe('Source Control & Real Git Operations (Isolated Temp Repo)', () => {
  let tmpBase = '';
  let bareRemote = '';
  let repoDir = '';
  let secondClone = '';

  before(async () => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'intellicode-git-test-'));
    bareRemote = path.join(tmpBase, 'remote.git');
    repoDir = path.join(tmpBase, 'work-repo');
    secondClone = path.join(tmpBase, 'second-clone');

    fs.mkdirSync(bareRemote, { recursive: true });
    fs.mkdirSync(repoDir, { recursive: true });

    await runGit(['init', '--bare', '-b', 'main'], bareRemote);
    await runGit(['init', '-b', 'main'], repoDir);
    await runGit(['config', 'user.name', 'Test User'], repoDir);
    await runGit(['config', 'user.email', 'test@example.com'], repoDir);

    fs.writeFileSync(path.join(repoDir, 'app.ts'), 'export const v = 1;\n', 'utf8');
    await runGit(['add', 'app.ts'], repoDir);
    await runGit(['commit', '-m', 'initial commit'], repoDir);
    await runGit(['remote', 'add', 'origin', bareRemote], repoDir);
    await runGit(['push', '-u', 'origin', 'main'], repoDir);
  });

  after(() => {
    if (tmpBase && fs.existsSync(tmpBase)) {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    }
  });

  it('detects modified, untracked, staged, deleted, and renamed files accurately', async () => {
    // Modify tracked file and add untracked file
    fs.writeFileSync(path.join(repoDir, 'app.ts'), 'export const v = 2;\n', 'utf8');
    fs.writeFileSync(path.join(repoDir, 'newFile.ts'), 'export const n = 1;\n', 'utf8');

    const status1 = await runGit(['status', '--porcelain=v1', '-uall'], repoDir);
    const parsed1 = parseGitStatusPorcelain(status1.stdout);
    assert.strictEqual(parsed1.stagedFiles.length, 0);
    assert.ok(parsed1.unstagedFiles.some((f) => f.path === 'app.ts' && f.status === 'M'));
    assert.ok(parsed1.unstagedFiles.some((f) => f.path === 'newFile.ts' && f.status === 'U'));

    // Stage only app.ts (never silently stage all)
    await runGit(['add', '--', 'app.ts'], repoDir);
    const status2 = await runGit(['status', '--porcelain=v1', '-uall'], repoDir);
    const parsed2 = parseGitStatusPorcelain(status2.stdout);
    assert.ok(parsed2.stagedFiles.some((f) => f.path === 'app.ts' && f.status === 'M'));
    assert.ok(parsed2.unstagedFiles.some((f) => f.path === 'newFile.ts' && f.status === 'U'));

    // Unstage app.ts
    await runGit(['reset', 'HEAD', '--', 'app.ts'], repoDir);
    const status3 = await runGit(['status', '--porcelain=v1', '-uall'], repoDir);
    const parsed3 = parseGitStatusPorcelain(status3.stdout);
    assert.strictEqual(parsed3.stagedFiles.length, 0);
  });

  it('discards tracked modifications and removes untracked files safely', async () => {
    const modDiscard = await discardFileChanges(repoDir, 'app.ts');
    assert.strictEqual(modDiscard.success, true);
    assert.strictEqual(modDiscard.deleted, false);
    assert.strictEqual(
      fs.readFileSync(path.join(repoDir, 'app.ts'), 'utf8').replace(/\r\n/g, '\n'),
      'export const v = 1;\n'
    );

    const untrackedDiscard = await discardFileChanges(repoDir, 'newFile.ts');
    assert.strictEqual(untrackedDiscard.success, true);
    assert.strictEqual(untrackedDiscard.deleted, true);
    assert.strictEqual(fs.existsSync(path.join(repoDir, 'newFile.ts')), false);
  });

  it('commits staged changes, tracks ahead/behind, and pushes/fetches/pulls with bare remote', async () => {
    fs.writeFileSync(path.join(repoDir, 'app.ts'), 'export const v = 3;\n', 'utf8');
    await runGit(['add', '--', 'app.ts'], repoDir);
    const commitRes = await runGit(['commit', '-m', 'bump v to 3'], repoDir);
    assert.strictEqual(commitRes.code, 0);

    const countsBeforePush = await getAheadBehindCounts(repoDir);
    assert.strictEqual(countsBeforePush.ahead, 1);
    assert.strictEqual(countsBeforePush.behind, 0);

    const pushRes = await runGit(['push', 'origin', 'main'], repoDir);
    assert.strictEqual(pushRes.code, 0);

    const countsAfterPush = await getAheadBehindCounts(repoDir);
    assert.strictEqual(countsAfterPush.ahead, 0);

    // Clone into secondClone, push a commit from secondClone, then fetch & check behind count in repoDir
    await runGit(['clone', bareRemote, secondClone], tmpBase);
    await runGit(['config', 'user.name', 'Peer User'], secondClone);
    await runGit(['config', 'user.email', 'peer@example.com'], secondClone);
    fs.writeFileSync(path.join(secondClone, 'peer.ts'), 'export const peer = true;\n', 'utf8');
    await runGit(['add', 'peer.ts'], secondClone);
    await runGit(['commit', '-m', 'peer commit'], secondClone);
    await runGit(['push', 'origin', 'main'], secondClone);

    const fetchRes = await fetchFromRemote(repoDir);
    assert.strictEqual(fetchRes.success, true);
    assert.strictEqual(fetchRes.behind, 1);

    const pullRes = await runGit(['pull', 'origin', 'main'], repoDir);
    assert.strictEqual(pullRes.code, 0);
    assert.ok(fs.existsSync(path.join(repoDir, 'peer.ts')));
  });

  it('creates branches and protects uncommitted changes during branch switching', async () => {
    const createRes = await checkoutBranchSafe(repoDir, 'feature-a', true);
    assert.strictEqual(createRes.success, true);
    fs.writeFileSync(path.join(repoDir, 'app.ts'), 'export const v = 99;\n', 'utf8');
    await runGit(['add', 'app.ts'], repoDir);
    await runGit(['commit', '-m', 'feature-a change'], repoDir);

    // Switch back to main and make conflicting uncommitted edit on app.ts
    const backToMain = await checkoutBranchSafe(repoDir, 'main', false);
    assert.strictEqual(backToMain.success, true);

    fs.writeFileSync(path.join(repoDir, 'app.ts'), 'export const v = 777;\n', 'utf8');
    const blockedSwitch = await checkoutBranchSafe(repoDir, 'feature-a', false);
    assert.strictEqual(blockedSwitch.success, false);
    assert.ok(blockedSwitch.error && blockedSwitch.error.includes('Branch switch blocked'));

    // Verify uncommitted edit was preserved and not overwritten
    assert.strictEqual(fs.readFileSync(path.join(repoDir, 'app.ts'), 'utf8'), 'export const v = 777;\n');
    await discardFileChanges(repoDir, 'app.ts');
  });

  it('formats conflict, auth, and non-fast-forward errors clearly', () => {
    assert.ok(formatGitError('CONFLICT (content): Merge conflict in app.ts').includes('Merge conflict detected'));
    assert.ok(formatGitError('fatal: Authentication failed for https://github.com/...').includes('Authentication failed'));
    assert.ok(formatGitError('! [rejected] main -> main (non-fast-forward)').includes('Push rejected'));
  });
});
