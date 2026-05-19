// audit #5~#8 spot check capture matrix
// Captures each audit's signature surface on production (mobile 375 + desktop 1440)
// + production fetch hash match (verify the audit's signature string is present).
import { chromium } from '/Users/curea/dev_git/pullim-preview/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = '/tmp/pullim-audit-matrix/2026-05-19';
mkdirSync(OUT, { recursive: true });

const PROD = 'https://pullim-planner.vercel.app';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const AUDITS = [
  {
    id: '5',
    label: 'timeline-trim',
    url: `${PROD}/planner`,
    signature: '전체 24h',
    setup: async (page) => {
      await page.locator('button:has-text("일간")').first().click().catch(() => {});
      await wait(400);
    },
  },
  {
    id: '6',
    label: 'demo-deadend',
    url: `${PROD}/planner/manage/new`,
    signature: '이전',
    setup: async () => {},
  },
  {
    id: '7',
    label: 'builder-min-h',
    url: `${PROD}/planner/manage/new`,
    signature: 'min-h',
    setup: async (page) => {
      const next = page.locator('button:has-text("다음")').first();
      for (let i = 0; i < 2; i++) {
        if (await next.isVisible().catch(() => false)) {
          await next.click().catch(() => {});
          await wait(400);
        }
      }
    },
  },
  {
    id: '8',
    label: 'reports-day-info-density',
    url: `${PROD}/planner/reports?view=day`,
    signature: '오늘 회고',
    setup: async () => {},
  },
];

async function captureAudit(browser, audit, viewport) {
  const ctx = await browser.newContext({
    viewport: viewport.size,
    locale: 'ko-KR',
    deviceScaleFactor: 2,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
  });
  const page = await ctx.newPage();
  await page.goto(audit.url, { waitUntil: 'networkidle' });
  await wait(800);
  await audit.setup(page);
  await wait(400);
  const file = `${OUT}/${viewport.label}-audit${audit.id}-${audit.label}.png`;
  await page.screenshot({ path: file, fullPage: true });

  const html = await page.content();
  const sigPresent = html.includes(audit.signature);

  await ctx.close();
  return { file, sigPresent, htmlLength: html.length };
}

async function main() {
  const browser = await chromium.launch();
  const results = [];

  const viewports = [
    { label: 'mobile-375', size: { width: 375, height: 812 }, mobile: true },
    { label: 'desktop-1440', size: { width: 1440, height: 900 }, mobile: false },
  ];

  for (const audit of AUDITS) {
    for (const vp of viewports) {
      try {
        const r = await captureAudit(browser, audit, vp);
        results.push({ audit: audit.id, viewport: vp.label, ...r, ok: true });
        console.log(`[OK] audit#${audit.id} ${vp.label} sig=${r.sigPresent}`);
      } catch (e) {
        results.push({ audit: audit.id, viewport: vp.label, ok: false, error: e.message });
        console.log(`[FAIL] audit#${audit.id} ${vp.label} ${e.message}`);
      }
    }
  }

  await browser.close();
  writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
  console.log('\n=== MATRIX ===');
  for (const r of results) {
    console.log(`audit#${r.audit} ${r.viewport}: ok=${r.ok} sig=${r.sigPresent ?? 'n/a'}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
