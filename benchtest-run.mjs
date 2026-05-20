#!/usr/bin/env node
/**
 * benchtest-run.mjs — Benchtest CLI entry point.
 *
 * Usage:
 *   node benchtest-run.mjs [options]
 *
 * Options:
 *   --scenario <name>   Scenario to run (code-review|bug-fix|refactor|e2e-test|docs-update|all)
 *   --url <url>         OpenCode server URL (default: http://100.81.83.98:4096)
 *   --api-key <key>     API key for OpenCode
 *   --out <dir>         Output directory (default: ./benchtest-out)
 *   --quick             Quick mode (single iteration)
 *   --stress <n>        Run N concurrent stress sessions
 *   --verbose           Verbose logging
 *   --baseline <file>   Baseline JSON file for regression comparison
 *   --help              Show help
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const getArg = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const hasFlag = (f) => args.includes(f);

if (hasFlag('--help') || hasFlag('-h')) {
  console.log(`
Benchtest Runner — audits and measures Pilot workflow performance

Usage:
  node benchtest-run.mjs --scenario code-review [options]

Scenarios:
  code-review           Review code files for quality issues
  bug-fix               Diagnose and fix a failing test
  refactor              Refactor a module with type safety
  e2e-test              Write a Playwright E2E test
  docs-update           Update documentation
  api-throughput        Benchmark memory CRUD API latency and throughput
  proxy-throughput      Benchmark SSE proxy streaming latency overhead
  terminal-concurrency  Benchmark WebSocket connection throughput
  all                   Run all scenarios sequentially

Options:
  --scenario <name>   Scenario name (default: all)
  --url <url>         OpenCode server URL (default: http://100.81.83.98:4096)
  --api-key <key>     API key
  --out <dir>         Output directory (default: ./benchtest-out)
  --quick             Quick mode — single iteration, minimal work
  --stress <n>        Run N concurrent stress sessions
  --baseline <file>   Baseline JSON for regression comparison
  --verbose           Verbose logging
  --help              Show this help
  `);
  process.exit(0);
}

// ─── Config ──────────────────────────────────────────────────────

const URL = getArg('--url') || process.env.BENCHTEST_URL || 'http://100.81.83.98:4096';
const API_KEY = getArg('--api-key') || process.env.OPENCODE_API_KEY || '';
const OUT_DIR = getArg('--out') || process.env.BENCHTEST_OUT_DIR || './benchtest-out';
const SCENARIO = getArg('--scenario') || 'all';
const QUICK = hasFlag('--quick') || !!process.env.BENCHTEST_QUICK;
const STRESS = parseInt(getArg('--stress') || '0', 10);
const VERBOSE = hasFlag('--verbose') || !!process.env.BENCHTEST_VERBOSE;
const BASELINE_FILE = getArg('--baseline') || '';

const SCENARIOS_LIST = ['code-review', 'bug-fix', 'refactor', 'e2e-test', 'docs-update', 'api-throughput', 'proxy-throughput', 'terminal-concurrency', 'workflow-routing', 'context-pack-size', 'plugin-hook-overhead', 'rtk-compression-savings', 'verify-plan-accuracy', 'reviewer-fanout-control'];

// ─── ANSI helpers ────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', white: '\x1b[97m', gray: '\x1b[90m',
};

function info(msg) { console.log(`${C.cyan}\u2139${C.reset} ${C.dim}${msg}${C.reset}`); }
function ok(msg)    { console.log(`  ${C.green}\u2713${C.reset} ${msg}`); }
function fail(msg)  { console.log(`  ${C.red}\u2717${C.reset} ${msg}`); }
function hdr(msg)   { console.log(`\n${C.bold}${C.white}\u25b8 ${msg}${C.reset}`); }

// ─── Runner ──────────────────────────────────────────────────────

async function runScenario(scenarioName) {
  hdr(`Running scenario: ${scenarioName}`);

  // Set env vars for benchtest plugin
  const env = {
    ...process.env,
    BENCHTEST_ENABLED: '1',
    BENCHTEST_SESSION_ID: `benchtest-${scenarioName}-${Date.now()}`,
    BENCHTEST_METRICS_OUT: path.join(OUT_DIR, `metrics-${scenarioName}.jsonl`),
    BENCHTEST_QUICK: QUICK ? '1' : '',
    OPENCODE_URL: URL,
    OPENCODE_API_KEY: API_KEY,
  };

  // Create output dir
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const startTime = Date.now();

  // Import and run the WorkflowRunner
  const { WorkflowRunner } = await import('./benchtest/dist/runners/WorkflowRunner.js');
  const { TerminalReporter } = await import('./benchtest/dist/reporters/TerminalReporter.js');
  const { JsonReporter } = await import('./benchtest/dist/reporters/JsonReporter.js');
  const { HtmlReporter } = await import('./benchtest/dist/reporters/HtmlReporter.js');

  const runner = new WorkflowRunner({
    url: URL,
    apiKey: API_KEY,
    scenario: scenarioName,
    outDir: OUT_DIR,
    quick: QUICK,
    verbose: VERBOSE,
  });

  const reports = await runner.run();
  const report = reports[0]; // Use first report

  // Print terminal report
  const terminal = new TerminalReporter();
  terminal.print(report);

  // Write JSON
  const jsonPath = path.join(OUT_DIR, `benchtest-${scenarioName}.json`);
  const jsonReporter = new JsonReporter();
  jsonReporter.write(report, jsonPath);
  ok(`JSON report: ${jsonPath}`);

  // Write HTML
  const htmlPath = path.join(OUT_DIR, `benchtest-${scenarioName}.html`);
  const htmlReporter = new HtmlReporter();
  const resolved = htmlReporter.generate(report, htmlPath);
  ok(`HTML report: ${resolved}`);

  // Regression comparison
  if (BASELINE_FILE) {
    const { RegressionRunner } = await import('./benchtest/dist/runners/RegressionRunner.js');
    const regRunner = new RegressionRunner();
    try {
      await regRunner.loadBaseline(BASELINE_FILE);
      const result = regRunner.compare(report);
      if (result.pass) {
        ok('No regressions detected');
      } else {
        fail(`${result.regressions.length} regression(s) detected:`);
        for (const r of result.regressions) {
          const sev = r.severity === 'high' ? C.red : C.yellow;
          console.log(`    ${sev}[${r.severity.toUpperCase()}]${C.reset} ${r.metric}: baseline=${r.baseline} actual=${r.actual} (${r.change > 0 ? '+' : ''}${r.change.toFixed(1)}%)`);
        }
      }
    } catch (e) {
      fail(`Cannot load baseline: ${e.message}`);
    }
  }

  const elapsed = Date.now() - startTime;
  info(`Completed in ${elapsed >= 1000 ? (elapsed / 1000).toFixed(1) + 's' : elapsed + 'ms'}`);

  return report;
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log(`${C.bold}${C.cyan}`);
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║         Pilot Benchtest Runner              ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log(`${C.reset}`);
  info(`Server : ${URL}`);
  info(`Out dir: ${path.resolve(OUT_DIR)}`);
  info(`Quick  : ${QUICK}`);
  if (STRESS > 0) info(`Stress : ${STRESS} concurrent sessions`);
  if (BASELINE_FILE) info(`Baseline: ${BASELINE_FILE}`);

  const scenariosToRun = SCENARIO === 'all' ? SCENARIOS_LIST : [SCENARIO];

  let allPassed = true;
  const allReports = [];

  for (const scenario of scenariosToRun) {
    try {
      const report = await runScenario(scenario);
      allReports.push(report);
      if (!report.summary.pass) allPassed = false;
    } catch (e) {
      fail(`Scenario ${scenario} crashed: ${e.message}`);
      if (VERBOSE) console.error(e);
      allPassed = false;
    }
  }

  // Summary
  console.log(`\n${C.bold}${C.white}══════════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}Overall: ${allPassed ? C.green + 'ALL PASSED' : C.red + 'SOME FAILED'}${C.reset}`);
  console.log(`${C.bold}${C.white}══════════════════════════════════════════════${C.reset}\n`);

  // Stress test if requested
  if (STRESS > 0) {
    hdr(`Stress Test (${STRESS} concurrent, scenario: ${scenariosToRun[0] || 'code-review'})`);
    const { StressRunner } = await import('./benchtest/dist/runners/StressRunner.js');
    const stressRunner = new StressRunner({
      url: URL,
      apiKey: API_KEY,
      scenario: scenariosToRun[0] || 'code-review',
      outDir: OUT_DIR,
      quick: true,
    });
    const stressResult = await stressRunner.run(STRESS);
    ok(`${stressResult.reports.length} sessions completed`);
    ok(`Duration: ${stressResult.totalDurationMs >= 1000 ? (stressResult.totalDurationMs / 1000).toFixed(1) + 's' : stressResult.totalDurationMs + 'ms'}`);
    ok(`Throughput: ${stressResult.throughputPerMin} sessions/min`);

    const stressPath = path.join(OUT_DIR, 'benchtest-stress.json');
    const jsonReporter = new JsonReporter();
    jsonReporter.writeAll(stressResult.reports, stressPath);
    ok(`Stress results: ${stressPath}`);
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(`Fatal: ${e.message}`);
  if (VERBOSE) console.error(e);
  process.exit(1);
});
