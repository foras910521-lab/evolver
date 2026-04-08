// Usage: node scripts/validate-suite.js [test-glob-pattern]
// Runs the project's test suite (node --test) with flaky-test awareness.
// When called without arguments, runs all tests in test/.
//
// Flaky-test integration:
//   1. First attempt: run tests directly (fast path for passing suites)
//   2. If first attempt fails: invoke flakyHandler to retry and classify
//   3. Truly broken (3+ consecutive failures) → exit 1
//   4. Flaky or passing → exit 0
//
// This prevents 1-2 intermittent test failures from blocking evolver cycles.

const { execSync } = require('child_process');
const path = require('path');

const pattern = process.argv[2] || 'test/**/*.test.js';
const repoRoot = process.cwd();

// Skill paths
const SKILLS_DIR = path.join(process.env.HOME || '', '.openclaw/workspace/skills');
const FTH_PATH = path.join(SKILLS_DIR, 'flaky-test-handler', 'index.js');

const cmd = `node --test ${pattern}`;

const testEnv = Object.assign({}, process.env, {
  NODE_ENV: 'test',
  EVOLVER_REPO_ROOT: repoRoot,
  GEP_ASSETS_DIR: path.join(repoRoot, 'assets', 'gep'),
  EVOLVER_REPO: repoRoot,
});

function runDirect() {
  try {
    const output = execSync(cmd, {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
      env: testEnv,
    });
    const out = output.toString('utf8');
    const passMatch = out.match(/# pass (\d+)/);
    const failMatch = out.match(/# fail (\d+)/);
    const passCount = passMatch ? Number(passMatch[1]) : 0;
    const failCount = failMatch ? Number(failMatch[1]) : 0;
    return { passCount, failCount, output: out, exitCode: 0 };
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString('utf8') : '';
    const stdout = e.stdout ? e.stdout.toString('utf8') : '';
    const combined = (stdout + stderr).slice(-2000);
    const passMatch = combined.match(/# pass (\d+)/);
    const failMatch = combined.match(/# fail (\d+)/);
    const passCount = passMatch ? Number(passMatch[1]) : 0;
    const failCount = failMatch ? Number(failMatch[1]) : 0;
    return {
      passCount,
      failCount,
      output: combined,
      exitCode: e.status || (failCount > 0 ? 1 : 1),
    };
  }
}

function runWithFTH() {
  try {
    const fth = require(FTH_PATH);
    const result = fth.flakyHandler({
      pattern,
      maxRetries: 2,
    });
    return result;
  } catch (e) {
    console.error('[validate-suite] flakyHandler unavailable: ' + e.message);
    return null;
  }
}

// Step 1: First attempt (fast path)
const firstResult = runDirect();

if (firstResult.failCount === 0) {
  console.log('ok: ' + firstResult.passCount + ' test(s) passed, 0 failed');
  process.exit(0);
}

// Step 2: First attempt failed — use flakyHandler for classification
console.error('[validate-suite] First attempt failed (' + firstResult.failCount + ' failures). Invoking flakyHandler...');

const fthResult = runWithFTH();

if (fthResult === null) {
  // flakyHandler unavailable — fall back to raw result
  console.error('FAIL: test suite exited with code ' + firstResult.exitCode);
  if (firstResult.output) console.error(firstResult.output.slice(-500));
  process.exit(firstResult.exitCode);
}

if (fthResult.success) {
  // Flaky tests detected but no truly broken tests
  const msg = 'ok: ' + fthResult.passCount + ' test(s) passed (' + fthResult.attempts + ' attempts, flaky detected)';
  if (fthResult.note) {
    console.log(msg + ' — ' + fthResult.note);
  } else {
    console.log(msg);
  }
  process.exit(0);
} else {
  // Truly broken tests (3+ consecutive failures)
  console.error('FAIL: test suite exited with code 1');
  if (fthResult.error) console.error(fthResult.error);
  if (fthResult.output) console.error(fthResult.output.slice(-500));
  console.error('[validate-suite] Broken tests: ' + (fthResult.brokenTests || []).join(', '));
  process.exit(1);
}
