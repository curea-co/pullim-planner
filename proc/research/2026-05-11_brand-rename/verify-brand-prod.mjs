/**
 * production 임베딩 메타 자동 검증 — 5종 크롤러 UA × 3개 라우트.
 * BASE_URL 기본값 production. 예: BASE_URL=http://localhost:3030 node verify-brand-prod.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'https://pullim-planner.vercel.app';

const ROUTES = [
  { name: 'home',    path: '/' },
  { name: 'planner', path: '/planner' },
  { name: 'manage',  path: '/planner/manage' },
];

const CRAWLERS = [
  { name: 'default-chromium',   ua: undefined },
  { name: 'kakaotalk',          ua: 'Mozilla/5.0 (compatible; Kakaotalk-Scrap/1.0; +https://devtalk.kakao.com)' },
  { name: 'facebookexternalhit', ua: 'facebookexternalhit/1.1 (+https://www.facebook.com/externalhit_uatext.php)' },
  { name: 'twitterbot',         ua: 'Twitterbot/1.0' },
  { name: 'slackbot',           ua: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)' },
];

const EXPECTED = '풀림 플래너';
const FORBIDDEN = '풀림 스터디';

const browser = await chromium.launch();
const results = [];

for (const route of ROUTES) {
  for (const crawler of CRAWLERS) {
    const context = await browser.newContext({ userAgent: crawler.ua });
    const page = await context.newPage();
    try {
      const resp = await page.goto(BASE + route.path, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const metas = await page.evaluate(() => {
        const get = (sel) => document.querySelector(sel)?.getAttribute('content') ?? null;
        return {
          title: document.title,
          description: get('meta[name="description"]'),
          applicationName: get('meta[name="application-name"]'),
          ogTitle: get('meta[property="og:title"]'),
          ogDescription: get('meta[property="og:description"]'),
          ogSiteName: get('meta[property="og:site_name"]'),
          twitterTitle: get('meta[name="twitter:title"]'),
          twitterDescription: get('meta[name="twitter:description"]'),
        };
      });
      results.push({
        route: route.name, crawler: crawler.name, status: resp?.status() ?? null, metas,
      });
    } catch (e) {
      results.push({ route: route.name, crawler: crawler.name, error: String(e) });
    }
    await context.close();
  }
}

let pass = 0, fail = 0;
const failures = [];
for (const r of results) {
  if (!r.metas) { fail++; failures.push(`${r.route}/${r.crawler}: ${r.error}`); continue; }
  for (const [field, value] of Object.entries(r.metas)) {
    if (!value) continue;
    if (value.includes(FORBIDDEN)) {
      fail++;
      failures.push(`${r.route}/${r.crawler}/${field}: contains "${FORBIDDEN}" — "${value}"`);
    } else if (['title','ogTitle','twitterTitle','ogSiteName','applicationName'].includes(field) && value.includes(EXPECTED)) {
      pass++;
    }
  }
}

console.log(`BASE: ${BASE}`);
console.log(`총 PASS ${pass} · FAIL ${fail}`);
if (failures.length > 0) {
  console.log('\n실패 내역:');
  failures.slice(0, 20).forEach(f => console.log(`  - ${f}`));
}

// 샘플 출력 — kakaotalk/planner의 메타
const sample = results.find(r => r.route === 'planner' && r.crawler === 'kakaotalk');
if (sample?.metas) {
  console.log('\n[샘플: planner × kakaotalk]');
  for (const [k, v] of Object.entries(sample.metas)) {
    console.log(`  ${k}: ${v}`);
  }
}

await browser.close();
process.exit(fail === 0 ? 0 : 1);
