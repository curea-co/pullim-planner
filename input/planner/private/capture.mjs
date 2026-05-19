// Capture interaction states for Pullim Planner private design audit.
import { chromium } from '/Users/curea/dev_git/pullim-preview/node_modules/playwright/index.mjs';

const OUT = '/tmp/pullim-audit/planner/private';
const URL_HOME = 'https://pullim-planner.vercel.app/planner';
const URL_REPORTS = 'https://pullim-planner.vercel.app/planner/reports';
const URL_MANAGE = 'https://pullim-planner.vercel.app/planner/manage';
const URL_ONBOARD = 'https://pullim-planner.vercel.app/planner/onboarding';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log('captured', name);
}
async function shotFull(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log('captured full', name);
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ko-KR',
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  // Desktop: planner home base
  await page.goto(URL_HOME, { waitUntil: 'networkidle' });
  await wait(800);
  await shotFull(page, 'desktop-base-full');

  // Hover on a block card (try the 19:30 row)
  try {
    const row = page.locator('text=빈칸 추론 정복 세트').first();
    await row.scrollIntoViewIfNeeded();
    await row.hover();
    await wait(400);
    await shot(page, 'desktop-block-hover');
  } catch (e) {
    console.log('hover block fail', e.message);
  }

  // Hover on the "지금 시작" CTA
  try {
    const cta = page.locator('button:has-text("지금 시작")').first();
    await cta.hover();
    await wait(300);
    await shot(page, 'desktop-cta-hover');
  } catch (e) { console.log('cta hover fail', e.message); }

  // Click 컨디션 펼치기
  try {
    const cond = page.locator('button:has-text("오늘 컨디션")').first();
    await cond.click();
    await wait(500);
    await shotFull(page, 'desktop-condition-open');
  } catch (e) { console.log('condition open fail', e.message); }

  // Click 오늘 회고 펼치기
  try {
    const retro = page.locator('button:has-text("오늘 회고")').first();
    await retro.click();
    await wait(500);
    await shotFull(page, 'desktop-retro-open');
  } catch (e) { console.log('retro open fail', e.message); }

  // Click "주간" tab
  try {
    const wk = page.locator('button:has-text("주간")').first();
    await wk.click();
    await wait(700);
    await shotFull(page, 'desktop-weekly-tab');
  } catch (e) { console.log('weekly tab fail', e.message); }

  // Click "월간" tab
  try {
    const mo = page.locator('button:has-text("월간")').first();
    await mo.click();
    await wait(700);
    await shotFull(page, 'desktop-monthly-tab');
  } catch (e) { console.log('monthly tab fail', e.message); }

  // Back to 일간
  try {
    await page.locator('button:has-text("일간")').first().click();
    await wait(500);
  } catch (e) {}

  // Click "전체 24h" toggle
  try {
    await page.locator('button:has-text("전체 24h")').first().click();
    await wait(500);
    await shotFull(page, 'desktop-24h-on');
  } catch (e) { console.log('24h fail', e.message); }

  // Click "색상 범례" toggle
  try {
    await page.locator('button:has-text("색상 범례")').first().click();
    await wait(400);
    await shot(page, 'desktop-legend-open');
  } catch (e) { console.log('legend fail', e.message); }

  // Click a calendar block bar — try clicking 18:25 area
  try {
    const ev = page.locator('text=미분 — 적응형 문제 풀이').first();
    await ev.click();
    await wait(500);
    await shot(page, 'desktop-block-click');
  } catch (e) { console.log('block click fail', e.message); }

  // Try clicking "이어서"
  try {
    const cont = page.locator('button:has-text("이어서")').first();
    await cont.hover();
    await wait(200);
    await shot(page, 'desktop-continue-hover');
  } catch (e) { console.log('continue fail', e.message); }

  // Reports page
  await page.goto(URL_REPORTS, { waitUntil: 'networkidle' });
  await wait(700);
  await shotFull(page, 'desktop-reports-base');
  // Hover on the bar chart
  try {
    const bar = page.locator('text=이번 주 학습 시간').first();
    await bar.scrollIntoViewIfNeeded();
    await wait(300);
    // hover near chart
    const box = await bar.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 80);
      await wait(300);
      await shot(page, 'desktop-reports-chart-hover');
    }
  } catch (e) { console.log('chart hover fail', e.message); }

  // Manage page
  await page.goto(URL_MANAGE, { waitUntil: 'networkidle' });
  await wait(700);
  await shotFull(page, 'desktop-manage-base');

  // Onboarding page full
  await page.goto(URL_ONBOARD, { waitUntil: 'networkidle' });
  await wait(700);
  await shotFull(page, 'desktop-onboarding-full');

  // Mobile viewport
  const m = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'ko-KR',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mp = await m.newPage();
  await mp.goto(URL_HOME, { waitUntil: 'networkidle' });
  await wait(800);
  await shotFull(mp, 'mobile-base-full');

  // Mobile condition open
  try {
    await mp.locator('button:has-text("오늘 컨디션")').first().click();
    await wait(500);
    await shotFull(mp, 'mobile-condition-open');
  } catch (e) { console.log('m condition fail', e.message); }

  // Mobile reports
  await mp.goto(URL_REPORTS, { waitUntil: 'networkidle' });
  await wait(700);
  await shotFull(mp, 'mobile-reports-full');

  // Mobile onboarding
  await mp.goto(URL_ONBOARD, { waitUntil: 'networkidle' });
  await wait(700);
  await shotFull(mp, 'mobile-onboarding-full');

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
