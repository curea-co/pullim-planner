/**
 * PR #4 Test Plan 검증 — 4종 주간 레이아웃 × 7종 팔레트 토글 + 시드 3건 디폴트 확인.
 *
 * 매니지 페이지 꾸미기 진입은 빌더 edit 페이지로 일원화됨 (D4).
 *   /planner/manage/[id]/edit?tab=layout
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:3030';

const WEEK_LAYOUTS = ['matrix_by_type', 'school_grid', 'bar_week', 'heatmap'];
const PALETTES = ['pullim_blue', 'forest', 'sunset', 'pastel', 'mono', 'mint', 'rose'];
const SEEDS = [
  { id: 'pl_001', weekLayout: 'matrix_by_type', palette: 'pullim_blue', label: '6월 모의평가 (active)' },
  { id: 'pl_002', weekLayout: 'school_grid',    palette: 'forest',      label: '1학기 기말고사 (inactive)' },
  { id: 'pl_003', weekLayout: 'heatmap',        palette: 'sunset',      label: '4월 학평 (archived)' },
];

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const mark = pass ? '✅' : '❌';
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function gotoLayoutTab(page, plannerId) {
  await page.goto(`${BASE}/planner/manage/${plannerId}/edit?tab=layout`, { waitUntil: 'networkidle' });
  // 꾸미기 섹션이 로드될 때까지 대기 — 주간 레이아웃 fieldset legend
  await page.getByText('주간 레이아웃', { exact: true }).first().waitFor({ timeout: 5000 });
}

async function pickPreviewTab(page, kind /* 'day' | 'week' */) {
  const tabLabel = kind === 'day' ? '일간' : '주간';
  // 미리보기 tablist 안의 버튼만 — '주간 레이아웃' fieldset legend와 충돌하지 않도록 role 사용
  await page.getByRole('tab', { name: tabLabel, exact: true }).click();
}

async function selectWeekLayout(page, id) {
  await page.locator(`input[name="week-layout"][value="${id}"]`).click({ force: true });
}
async function selectPalette(page, id) {
  await page.locator(`input[name="palette"][value="${id}"]`).click({ force: true });
}

async function isChecked(page, name, value) {
  return await page.locator(`input[name="${name}"][value="${value}"]`).isChecked();
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 콘솔 에러 수집
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  // ─── Test 2: 시드 3건 디폴트 검증 ───
  console.log('\n=== Test 2: 시드 3건 디폴트 weekLayout/palette ===');
  for (const seed of SEEDS) {
    try {
      await gotoLayoutTab(page, seed.id);
      const wl = await isChecked(page, 'week-layout', seed.weekLayout);
      const pl = await isChecked(page, 'palette', seed.palette);
      record(
        `[${seed.id}] ${seed.label}`,
        wl && pl,
        `weekLayout=${seed.weekLayout}:${wl ? 'ok' : 'MISS'} · palette=${seed.palette}:${pl ? 'ok' : 'MISS'}`,
      );
    } catch (e) {
      record(`[${seed.id}] ${seed.label}`, false, `error: ${e.message}`);
    }
  }

  // ─── Test 1: 4종 × 7종 토글 (pl_001 컨텍스트에서) ───
  console.log('\n=== Test 1: 4종 weekLayout × 7종 palette 토글 (pl_001) ===');
  await gotoLayoutTab(page, 'pl_001');
  await pickPreviewTab(page, 'week');

  for (const wl of WEEK_LAYOUTS) {
    for (const pal of PALETTES) {
      try {
        await selectWeekLayout(page, wl);
        await selectPalette(page, pal);
        // 미리보기가 렌더링되는지 — section[aria-label="시간표 꾸미기"] 안에 SVG/div가 살아있는지
        const wlChecked = await isChecked(page, 'week-layout', wl);
        const palChecked = await isChecked(page, 'palette', pal);
        // 미리보기 박스(주간) — ActiveWeekLayout가 렌더링한 첫 children이 존재해야
        const previewVisible = await page.locator('section[aria-label="시간표 꾸미기"]').isVisible();
        const ok = wlChecked && palChecked && previewVisible && errors.length === 0;
        if (!ok) {
          record(`${wl} × ${pal}`, false, `radio=${wlChecked}/${palChecked} preview=${previewVisible} errs=${errors.length}`);
        } else {
          // 통과는 묶어서 보고 — 노이즈 줄임
        }
      } catch (e) {
        record(`${wl} × ${pal}`, false, `error: ${e.message}`);
      }
    }
  }
  const toggleFails = results.filter(r => /×/.test(r.name) && !r.pass).length;
  record(`4×7=28 토글 조합 모두 통과`, toggleFails === 0, `fails=${toggleFails}`);

  // 콘솔 에러 보고
  if (errors.length > 0) {
    console.log('\n=== 감지된 콘솔/페이지 에러 ===');
    errors.slice(0, 10).forEach(e => console.log('  -', e));
  } else {
    console.log('\n✓ 콘솔/페이지 에러 0건');
  }

  const fails = results.filter(r => !r.pass).length;
  console.log(`\n총 ${results.length}건 — PASS ${results.length - fails} / FAIL ${fails}`);

  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
})();
