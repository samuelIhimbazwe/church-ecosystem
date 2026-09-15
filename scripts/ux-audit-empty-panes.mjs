/**
 * Live UX audit: empty list|detail panes, stranded pickers, blank filters.
 * Run: node scripts/ux-audit-empty-panes.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const BASE = process.env.AUDIT_BASE || 'http://localhost:5173';

const CORE = [
  '/inbox',
  '/people',
  '/organization',
  '/participation',
  '/programs',
  '/events',
  '/tasks',
  '/projects',
  '/calendar',
  '/reports',
  '/access',
  '/systems',
  '/dashboard',
];

const CHOIR = [
  '/systems/choir',
  '/systems/choir/mission',
  '/systems/choir/people',
  '/systems/choir/families',
  '/systems/choir/repertoire',
  '/systems/choir/sections',
  '/systems/choir/rehearsals',
  '/systems/choir/roster',
  '/systems/choir/my-contributions',
  '/systems/choir/finance',
  '/systems/choir/donations',
  '/systems/choir/sponsors',
  '/systems/choir/fundraising',
  '/systems/choir/accounting',
  '/systems/choir/assets',
  '/systems/choir/reports',
];

const WORSHIP = [
  '/systems/worship',
  '/systems/worship/mission',
  '/systems/worship/people',
  '/systems/worship/families',
  '/systems/worship/repertoire',
  '/systems/worship/sections',
  '/systems/worship/rehearsals',
  '/systems/worship/roster',
  '/systems/worship/my-contributions',
  '/systems/worship/finance',
  '/systems/worship/reports',
];

const YOUTH = [
  '/systems/youth',
  '/systems/youth/mission',
  '/systems/youth/programs',
  '/systems/youth/events',
  '/systems/youth/tasks',
  '/systems/youth/projects',
  '/systems/youth/calendar',
  '/systems/youth/finance',
  '/systems/youth/reports',
];

const MUSIC = [
  '/systems/music',
  '/systems/music/mission',
  '/systems/music/schedule',
  '/systems/music/schedule-inbox',
  '/systems/music/programs',
  '/systems/music/events',
  '/systems/music/tasks',
  '/systems/music/projects',
  '/systems/music/calendar',
  '/systems/music/finance',
  '/systems/music/reports',
];

const PROTOCOL = [
  '/systems/protocol',
  '/systems/protocol/mission',
  '/systems/protocol/members',
  '/systems/protocol/calendar',
  '/systems/protocol/teams',
  '/systems/protocol/review',
  '/systems/protocol/attendance',
  '/systems/protocol/mine',
  '/systems/protocol/finance',
  '/systems/protocol/inbox',
  '/systems/protocol/reports',
];

const DEACON = [
  '/systems/deacon',
  '/systems/deacon/mission',
  '/systems/deacon/roster',
  '/systems/deacon/cases',
  '/systems/deacon/visits',
  '/systems/deacon/my-contributions',
  '/systems/deacon/finance',
];

const FINANCE = [
  '/finance',
  '/finance/mission',
  '/finance/ledger',
  '/finance/funds',
  '/finance/reports',
];

const EXTRA = [
  '/systems/choir/finance?tab=contributions',
  '/systems/choir/finance?view=contributions',
];

const SELECT_RE =
  /\b(Select[.…]|Pick[.…]|Nothing selected|Choose a row|Choose a |Select a |No .*selected|Loading preview|Queue empty)\b/i;

const findings = [];
const working = [];

function addFinding(f) {
  findings.push(f);
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('input[name="username"], #username, input[type="text"]', 'pastor');
  await page.fill('input[name="password"], #password, input[type="password"]', 'pastor123');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForTimeout(800);
}

async function extractSignals(page) {
  return page.evaluate((selectReSource) => {
    const selectRe = new RegExp(selectReSource, 'i');
    const main =
      document.querySelector('main') ||
      document.querySelector('.app-main') ||
      document.querySelector('#root') ||
      document.body;

    const text = (main?.innerText || '').replace(/\s+/g, ' ').trim();
    const title =
      document.querySelector('h1, h2, .page-head h1, .page-title')?.textContent?.trim() ||
      document.title;

    const emptyStates = [...document.querySelectorAll('.empty-state, [class*="EmptyState"], .forbidden-state')]
      .map((el) => (el.innerText || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 8);

    const selectish = emptyStates.filter((t) => selectRe.test(t));
    const bodySelectHits = [];
    if (selectRe.test(text)) {
      const m = text.match(selectRe);
      if (m) bodySelectHits.push(m[0]);
    }
    // Find surrounding context for select phrases
    const walk = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    const phraseHits = [];
    while (walk.nextNode()) {
      const v = walk.currentNode.nodeValue?.trim();
      if (!v || v.length > 120) continue;
      if (selectRe.test(v)) phraseHits.push(v);
    }

    const masterDetail = document.querySelector('.master-detail, .people-split, .list-detail, .split-pane');
    const mdList = masterDetail?.querySelector(
      '.master-detail-list, .people-split > .panel, aside, [aria-label="Items"]',
    );
    const mdPane = masterDetail?.querySelector(
      '.master-detail-pane, .profile-rail, .detail-pane',
    );
    const listRows = masterDetail
      ? masterDetail.querySelectorAll(
          'tbody tr, .inbox-master-row, [role="option"], .people-row, button.btn.ghost, .stage-card, a.list-row, li button',
        ).length
      : 0;
    const paneText = (mdPane?.innerText || '').replace(/\s+/g, ' ').trim();
    const paneLooksEmpty =
      !!masterDetail &&
      listRows > 0 &&
      (paneText.length < 40 ||
        selectRe.test(paneText) ||
        /Nothing selected|Choose a|Select a|Loading preview|Queue empty/i.test(paneText));

    const tables = [...document.querySelectorAll('table.table, .data-table, [role="table"]')];
    const tableInfo = tables.slice(0, 5).map((t) => ({
      rows: t.querySelectorAll('tbody tr').length,
      text: (t.innerText || '').slice(0, 80),
    }));

    const disabledBtns = [...document.querySelectorAll('button[disabled], a[aria-disabled="true"]')]
      .map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim())
      .filter((t) => t && t.length < 60)
      .slice(0, 12);

    const blankMain =
      text.length < 80 &&
      !document.querySelector('.spinner, [aria-busy="true"], .skeleton, .list-skeleton');

    const choirPicker = /Select a choir/i.test(text);
    const filterTabs = [...document.querySelectorAll('.filter-bar button, [role="tab"], .tabs button')]
      .map((b) => ({
        label: (b.innerText || '').trim(),
        pressed: b.getAttribute('aria-pressed') === 'true' || b.classList.contains('active'),
        disabled: b.disabled,
      }))
      .slice(0, 20);

    return {
      title,
      path: location.pathname + location.search,
      textLen: text.length,
      textSample: text.slice(0, 500),
      emptyStates,
      selectish,
      phraseHits: [...new Set(phraseHits)].slice(0, 10),
      hasMasterDetail: !!masterDetail,
      listRows,
      paneText: paneText.slice(0, 300),
      paneLooksEmpty,
      tableInfo,
      disabledBtns,
      blankMain,
      choirPicker,
      filterTabs,
      hasError:
        /Cannot GET|Something went wrong|Unhandled|TypeError|is not defined|Failed to fetch/i.test(
          text,
        ),
    };
  }, SELECT_RE.source);
}

async function tryClickFirstRow(page, signals) {
  if (!signals.hasMasterDetail || signals.listRows === 0) return null;
  const before = signals.paneText;
  const selectors = [
    '.inbox-master-row',
    '.people-row',
    '.master-detail-list tr',
    '.master-detail-list [role="option"]',
    '.master-detail-list button',
    '.people-split tbody tr',
    '.master-detail button.btn.ghost',
  ];
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) === 0) continue;
    try {
      await loc.click({ timeout: 2000 });
      await page.waitForTimeout(400);
      const after = await extractSignals(page);
      if (after.paneLooksEmpty || after.paneText === before) {
        return {
          clicked: sel,
          before: before.slice(0, 120),
          after: after.paneText.slice(0, 120),
          stillEmpty: after.paneLooksEmpty,
        };
      }
      return { clicked: sel, ok: true, after: after.paneText.slice(0, 120) };
    } catch {
      /* try next */
    }
  }
  return null;
}

async function tryFilterTabs(page) {
  const tabs = page.locator('.filter-bar button, [role="tab"]');
  const n = Math.min(await tabs.count(), 6);
  const results = [];
  for (let i = 0; i < n; i++) {
    const tab = tabs.nth(i);
    const label = ((await tab.innerText()) || '').trim();
    try {
      await tab.click({ timeout: 1500 });
      await page.waitForTimeout(350);
      const s = await extractSignals(page);
      if (s.blankMain || (s.paneLooksEmpty && s.listRows > 0)) {
        results.push({
          label,
          blankMain: s.blankMain,
          paneLooksEmpty: s.paneLooksEmpty,
          listRows: s.listRows,
          emptyStates: s.emptyStates.slice(0, 2),
        });
      }
    } catch {
      /* ignore */
    }
  }
  return results;
}

async function auditRoute(page, path) {
  const url = `${BASE}${path}`;
  const result = {
    url: path,
    status: 'ok',
    signals: null,
    click: null,
    filterIssues: [],
  };
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(900);
    // settle spinners
    for (let i = 0; i < 8; i++) {
      const busy = await page.locator('.spinner, .list-skeleton, [aria-busy="true"]').count();
      if (busy === 0) break;
      await page.waitForTimeout(400);
    }
    if (page.url().includes('/login')) {
      result.status = 'redirected-login';
      addFinding({
        severity: 'high',
        url: path,
        saw: 'Redirected to login / lost session',
        expected: 'Authenticated view for pastor',
      });
      return result;
    }
    const signals = await extractSignals(page);
    result.signals = signals;

    if (signals.hasError) {
      addFinding({
        severity: 'critical',
        url: path,
        saw: `Error content: ${signals.textSample.slice(0, 200)}`,
        expected: 'Working page content',
      });
    }

    if (signals.blankMain) {
      addFinding({
        severity: 'high',
        url: path,
        saw: `Main area nearly blank (${signals.textLen} chars)`,
        expected: 'List content or intentional empty state',
      });
    }

    if (signals.choirPicker) {
      addFinding({
        severity: 'high',
        url: path,
        saw: 'Stranded on “Select a choir” picker',
        expected: 'Auto-select or proceed into choir workspace when entitled',
      });
    }

    if (signals.paneLooksEmpty) {
      addFinding({
        severity: 'high',
        url: path,
        saw: `Split list|detail with ${signals.listRows} list rows but empty/select detail: “${signals.paneText.slice(0, 140)}”`,
        expected: 'Auto-select first row and show detail (useListSelection pattern)',
      });
    }

    for (const p of signals.phraseHits) {
      // Ignore legitimate empty-list copy and form placeholders in selects
      if (/Queue empty|Nothing in this list yet|No person matches/i.test(p)) continue;
      if (/Select…|Select\.\.\./.test(p) && !signals.hasMasterDetail) continue;
      if (
        /Nothing selected|Choose a row|Choose a |Select a |Pick a |Loading preview/i.test(p)
      ) {
        addFinding({
          severity: signals.listRows > 0 || signals.tableInfo.some((t) => t.rows > 0) ? 'high' : 'medium',
          url: path,
          saw: `Select/empty copy visible: “${p}” (listRows=${signals.listRows})`,
          expected: 'Detail filled when items exist; empty only when list empty',
        });
      }
    }

    // Disabled CTAs when tables have rows — heuristic for approve/verify actions
    const actionableDisabled = signals.disabledBtns.filter((t) =>
      /approve|verify|post|submit|publish|confirm|open|mark|send|create|export/i.test(t),
    );
    if (
      actionableDisabled.length &&
      signals.tableInfo.some((t) => t.rows > 0) &&
      !signals.phraseHits.some((p) => /select|choose|pick/i.test(p))
    ) {
      // Only flag if selection-related buttons stay disabled with visible rows and no selection UI
      const selRelated = actionableDisabled.filter((t) =>
        /approve|verify|confirm|post|publish/i.test(t),
      );
      if (selRelated.length) {
        addFinding({
          severity: 'medium',
          url: path,
          saw: `Disabled action CTAs with table rows present: ${selRelated.join(', ')}`,
          expected: 'CTA enabled when selection/context allows, or clear reason why disabled',
        });
      }
    }

    result.click = await tryClickFirstRow(page, signals);
    if (result.click && result.click.stillEmpty) {
      addFinding({
        severity: 'critical',
        url: path,
        saw: `Clicked list row (${result.click.clicked}) but detail stayed empty: “${result.click.after}”`,
        expected: 'Detail pane updates on row click',
      });
    }

    result.filterIssues = await tryFilterTabs(page);
    for (const fi of result.filterIssues) {
      addFinding({
        severity: 'high',
        url: path,
        saw: `Filter/tab “${fi.label}” left area blank or empty detail (listRows=${fi.listRows})`,
        expected: 'Filter shows matching results or clear empty state, not blank pane',
      });
    }

    // Collect systems links from /systems
    if (path === '/systems') {
      const links = await page.evaluate(() =>
        [...document.querySelectorAll('a[href^="/systems/"]')]
          .map((a) => a.getAttribute('href'))
          .filter(Boolean),
      );
      result.systemLinks = [...new Set(links)];
    }

    const hasIssue = findings.some((f) => f.url === path);
    if (!hasIssue && !signals.hasError && !signals.blankMain) {
      working.push({
        url: path,
        title: signals.title,
        note: signals.hasMasterDetail
          ? `MasterDetail OK (${signals.listRows} rows, detail filled)`
          : signals.emptyStates[0]
            ? `OK with empty: ${signals.emptyStates[0].slice(0, 80)}`
            : `OK (${signals.textLen} chars)`,
      });
    }
  } catch (err) {
    result.status = 'error';
    addFinding({
      severity: 'critical',
      url: path,
      saw: `Navigation/audit error: ${err.message}`,
      expected: 'Page loads',
    });
  }
  return result;
}

async function discoverExtraRoutes(page) {
  const extras = new Set();
  // From systems launcher after visiting /systems
  await page.goto(`${BASE}/systems`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('a[href]')]
      .map((a) => a.getAttribute('href'))
      .filter((h) => h && (h.startsWith('/systems/') || h.startsWith('/finance'))),
  );
  for (const h of hrefs) extras.add(h.split('?')[0]);

  // Protocol history deep link if present in nav
  const hist = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a')].find((el) =>
      /history|protocol/i.test(el.textContent || ''),
    );
    return a?.getAttribute('href') || null;
  });
  if (hist) extras.add(hist);

  // Contribution finance routes often nested
  extras.add('/systems/choir/finance');
  extras.add('/systems/worship/finance');

  return [...extras];
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  console.log('Logging in as pastor…');
  await login(page);
  console.log('Logged in at', page.url());

  const routes = [
    ...CORE,
    ...CHOIR,
    ...WORSHIP,
    ...YOUTH,
    ...MUSIC,
    ...PROTOCOL,
    ...DEACON,
    ...FINANCE,
    ...EXTRA,
  ];

  const discovered = await discoverExtraRoutes(page);
  for (const d of discovered) {
    if (!routes.includes(d)) routes.push(d);
  }

  // Unique preserve order
  const seen = new Set();
  const unique = routes.filter((r) => {
    if (seen.has(r)) return false;
    seen.add(r);
    return true;
  });

  console.log(`Auditing ${unique.length} routes…`);
  const results = [];
  for (const r of unique) {
    process.stdout.write(`  ${r} … `);
    const res = await auditRoute(page, r);
    results.push(res);
    const issues = findings.filter((f) => f.url === r).length;
    console.log(issues ? `${issues} issue(s)` : 'ok');
  }

  // Deduplicate findings
  const key = (f) => `${f.url}|${f.saw}`;
  const uniqFindings = [];
  const fk = new Set();
  for (const f of findings) {
    if (fk.has(key(f))) continue;
    fk.add(key(f));
    uniqFindings.push(f);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    routeCount: unique.length,
    findingCount: uniqFindings.length,
    findings: uniqFindings.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
    }),
    working,
    routes: unique,
  };

  const outPath = 'scripts/ux-audit-empty-panes-report.json';
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(`Findings: ${uniqFindings.length}; Working: ${working.length}`);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
