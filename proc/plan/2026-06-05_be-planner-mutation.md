# 2026-06-05 — Phase ε: planner mutation + per-user write (실 DB 저장/로드)

## 목표

`pullim-planner` 의 시간표(플래너)·과목단원·꾸미기(customization) 를 **로그인 사용자별로
실제 DB(로컬 Postgres)에 저장·로드**한다. 직전까지 BE 는 read 3건(Phase δ)만 있고 mutation 이
전무했으며, 모든 엔드포인트가 `@Public()` + 데모 사용자(student_001) 고정이라 "각 사용자가
커스텀한 시간표 저장" 이 성립하지 않았다. 본 Phase 가 그 갭(저장 경로 0 + per-user 0)을 메운다.

> DB 선택: Supabase free tier 소진으로 **로컬 Postgres(docker-compose)** 로 진행. 코드는
> `DATABASE_URL` 우선 파싱 + `sslmode=require` SSL 처리가 이미 있어, 추후 RDS/Supabase 전환은
> **환경변수 교체 + `migration:run`** 수준(코드 변경 거의 0). 엔티티·마이그레이션이 표준
> Postgres 라 엔진 간 차이 없음.

**완료 기준** (검증됨):
- mutation 8 라우트 동작: `POST /planners`, `PUT /planners/:id`, `DELETE /planners/:id`,
  `POST /planners/:id/{activate,archive,unarchive,duplicate}`, `PUT /planners/:id/customization`
- per-user write/read: 모든 planner 엔드포인트에서 `@Public()` 제거 → 전역 `JwtAuthGuard` 강제,
  `getCurrentUserId(req)=req.user.id` 로 본인 소유에만 적용. 무토큰 401.
- 실 DB 라운드트립 검증: signup→token→POST→GET→`psql` 직접 조회로 영속 확인 (아래 §4)
- 활성 불변식: user 당 active 1건(partial unique index), 활성 플래너 삭제·아카이브 불가(409)
- typecheck 0, 백엔드 테스트 61 passed (mutation e2e 11건 포함)

## 1. 범위 결정 (2026-06-05 사용자 대화)

| 항목 | 결정 |
|---|---|
| DB | 로컬 Postgres (Supabase 보류, RDS 추후) |
| 범위 | **mutation + per-user + FE 연결** (풀스코프) |
| 본 PR | BE 백본만 (mutation + per-user). FE·api-client 는 후속 PR (#1 규칙: FE/BE 분리) |

## 2. 설계 — 기존 clean architecture 확장

read 경로와 동일 계층(controller→use-case(Facade)→service→repository(interface+TypeORM)).

- **요청 DTO** `planner-write.dto.ts`: FE mock `Planner` 의 중첩 입력 shape
  (`formToPlannerPatch` 반환 = `Omit<Planner,'id'|'active'|'archived'|'createdAt'|'updatedAt'>`)
  를 그대로 받음. 생성·수정 동일(full replace — FE 가 전체 폼 전송). `PlannerResponseDto.from`
  의 역방향 매핑(중첩→평면 컬럼 + subject_units 행)은 service 가 담당.
- **repository write**: 다중 행 변경은 `DataSource.transaction`.
  - `setActivePlanner`: 같은 tx 에서 기존 active 해제 후 대상 켜기 (partial unique index 위반 방지)
  - `replacePlanner`: 편집 필드 update + subject_units delete 후 재삽입 (복합 PK 라 교체 방식)
- **service 도메인 규칙**: 소유권(404/403), 활성 삭제·아카이브 금지(409), 활성화 시 아카이브 불가(409)
- **per-user**: read/mutation 컨트롤러 모두 `@Public()` 제거. 실 부팅(JwtAuthGuard)=토큰 강제,
  스모크 부팅(MockAuthGuard)=데모 주입 → 기존 스모크/계약 테스트 무영향.

## 3. 변경 파일

신규: `controller/planner-mutation.controller.ts`, `controller/dto/{planner-write,customization}.dto.ts`,
`use-cases/{create,update,delete,activate,archive,duplicate,update-customization}-planner*.ts` (7),
본 plan 문서.
수정: `interface/planner-repository.interface.ts`, `infrastructure/planner.repository.ts`,
`service/planner.service.ts`, `planner.module.ts`, read 컨트롤러 3종(`@Public()` 제거),
`test/planner-endpoints.e2e.spec.ts`(stateful mock + mutation 11건).

## 4. 실 DB 검증 결과 (2026-06-05, 로컬 Postgres)

1. signup → login → `/me`: 새 유저 UUID 반환 (데모 student_001 아님) ✅
2. `POST /planners` (과목단원 2과목 + customization) → 201, DB `planners` + `planner_subject_units`
   (position 0/1) 행 생성, `user_id` = 로그인 유저 UUID ✅
3. `GET /planners` (토큰): 본인 시간표 1건 로드, 중첩 shape 복원 ✅
4. `psql` 직접 조회: 행 영속 확인 ✅
5. `activate`→200/DB `active=t`, 활성삭제→409, `duplicate`→"(복사)" inactive, 없는 id→404, 빈 name→422 ✅
6. 무토큰 `GET /planners`→401 (per-user 격리) ✅

## 5. 후속 (별도 PR — #1 규칙: FE/BE 분리)

- **PR2 (공유)**: `packages/api-client` 에 planner CRUD 클라이언트 + `packages/types` 공유 계약
- **PR3 (FE)**: `apps/planner` manage/builder 컨테이너를 mock → 실 API 전환 (mock 직접 import 제거)
- **추후**: time_blocks(시간표 학습 블록) mutation, RDS/Supabase 전환(환경변수+migration)
