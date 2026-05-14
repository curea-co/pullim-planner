# reports F1~F7 production dogfood — 2026-05-14

어제(2026-05-13) 머지된 PR #9의 reports 강화 7건(F1~F7)이 production에 정상 반영됐는지 mobile(375px) + desktop(1440px) 2 viewport × 3 view(day/week/month) + parent dialog로 시각 검증.

## 환경

| 항목 | 값 |
|---|---|
| URL | `https://pullim-planner.vercel.app/planner/reports` |
| 검증 시각 | 2026-05-14 (목) 오전 |
| 도구 | Playwright chromium (headless) |
| 캡처 디렉토리 | `/tmp/reports-dogfood/` |
| Viewport | mobile-375 (W375 × H1400), desktop-1440 (W1440 × H1600) |

## F1~F7 노출 매칭 표

| # | 항목 | 시각 노출 | desktop 캡처 | mobile 캡처 |
|---|---|---|---|---|
| **F1** | TodayReflection reports 모드에서 default expanded | ✅ `오늘 회고` 카드가 펼쳐진 상태로 진입 — 학습시간 1h 16m / 평균 정확도 88% / 감정 평균 4.0, 블록별 결과 7건, "내일 뭐가 다른가" 3건, "내일 캘린더 보기"·"오늘 학습 마감" CTA 2개 노출 | `desktop-1440_day.png` | `mobile-375_day.png` |
| **F2** | Weekly 메트릭을 진짜 주간 평균으로 | ✅ 4 KPI 카드 — 학습시간 **29.3h** / 평균 정답률 **82%** / 약점 정복 **2건** / 감정 평균 **3.8/5**. mock 일일값 차용 아닌 weekView 기반 진짜 주간 평균. `완료율 47%`, `잔여 10건`, `블록 완료 시 보고` 등 보조 라벨 노출 | `desktop-1440_week.png` | `mobile-375_week.png` |
| **F3** | Weekly insights 동적 생성 | ✅ "이번 주 인사이트" 섹션 3건 — `정답률 +6% — 새 단원 진입 적기` / `약점 2건 정복 — 다음 주 보강 블록 줄어들어요` / `목 학습 시간 부족 (2.4h / 목표 4h) — 평일 시간대 점검`. 하드코딩 아닌 `thisWeekInsights()` 동적 생성 | `desktop-1440_week.png` | (week 캡처 하단 영역) |
| **F4** | Burnout·Condition trend 카드 | ✅ 2 카드 — `컨디션 trend` (7일 자기 보고, 월~일 이모지+막대) / `번아웃 안전도` (월 72, 화 68, 수 70, 목 64, 금 58, 토 66, 일 71 — 금요일만 주황 임계 + `금요일 위험 신호 — 휴식 권장` 알림) | `desktop-1440_week.png` | `mobile-375_week.png` |
| **F5** | ParentReportCard | ✅ "부모님께 보내기" CTA 클릭 → dialog 열림. 부모님이 받는 카드 미리보기(이번 주 학습 요약 · 서연 학생, 29.3h/30h, 정답률 82%, 약점 정복 2건), 부모 연락처(010-****-1234 · @mom_seo), 공유 항목 토글 5개(주간 요약 ✓ / 월간 회고 / 약점 단원 ✓ / 감정 평균 / 실시간 알림), 동의 기간(이번 주만 / 이번 달만 / 계속), 카톡 전송 CTA | `desktop-1440_parent.png` | `mobile-375_parent.png` |
| **F6** | Month 임계 — "100% 완료한 날" | ✅ Month view 상단 3 KPI — **100% 완료한 날 4일 / 23일 중** · 현재 연속 학습 17일 streak · 시험까지 진척 77% (D-21). 어제 PR 이전엔 0일이었던 임계가 ≥95%로 완화되어 4일 표시 | `desktop-1440_month.png` | `mobile-375_month.png` |
| **F7** | vs 지난주 delta | ✅ Week KPI 4개 모두 delta 노출 — 학습시간 **↑4h**, 평균 정답률 **↑6%p**, 약점 정복 **↑1건**, 감정 평균 **↑0.2**. 화살표 + 색상으로 추세 즉시 인식 | `desktop-1440_week.png` | `mobile-375_week.png` |

## 결과

**7/7 모두 시각 노출 확인.** 완료기준 "6/7 이상" 초과 달성.

추가 관찰:
- 모든 카드가 mobile 375px에서 정상 반응형 — 텍스트 truncation·줄바꿈·gap 모두 적절. desktop 1440px에서 grid 컬럼 분할도 자연스러움.
- F5 dialog는 modal 형태로 mobile에서 bottom sheet 스타일, desktop에서 centered modal. 한 컴포넌트로 두 viewport 모두 cover.
- F4 번아웃 카드의 임계 색상 전환(녹 → 주)이 한 viewport에서 즉시 식별 가능. 금요일 위험 신호의 inline 알림이 카드 footer에 자연스럽게 붙음.

## production 반영 메타

- main commit (verify 시점): `d545dfb` (오늘 PR #11 머지) — F1~F7는 그 직전 `a6de56c` (PR #9) 머지에서 들어옴
- 이번 verify는 PR #11 머지 후 `vercel --prod`로 수동 promote한 deployment(`dpl_EikuoMx5LtMKYtLKCtqg4S8fS9ZD`, `pullim-planner-oxkxt2bvw`)에서 진행. F1~F7 자체는 이전 promote에서 이미 반영돼 있었음.

## webhook 사후

- Vercel Git integration은 어제(2026-05-13) 끊김 상태가 오늘까지 이어짐. 머지마다 `vercel --prod` 수동 우회 필요.
- 근본 복구는 Vercel Settings → Git Production Branch 재연결 (사용자 액션). 어제 daily_outcome A의 완료기준 그대로 carry over.

## 참고

- 어제 PR #9: https://github.com/curea-co/pullim-planner/pull/9
- 어제 plan: `proc/archive/2026-05-13_reports-enhancement.md` (1단계 갭 분석 + F1~F7 후보), `proc/archive/2026-05-13_reports-f1-to-f7-impl.md` (구현)
- 캡처: `/tmp/reports-dogfood/{mobile-375,desktop-1440}_{day,week,month,parent}.png` (총 8장)
