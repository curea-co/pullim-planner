import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { BlockCompletion } from "../../entities/block-completion.entity";
import { Planner } from "../../entities/planner.entity";
import { PlannerSubjectUnit } from "../../entities/planner-subject-unit.entity";
import { TimeBlock } from "../../entities/time-block.entity";
import { DomainUser } from "../auth/identity/domain-user.entity";
import { BlocksController } from "./controller/blocks.controller";
import { MeController } from "./controller/me.controller";
import { PlannerController } from "./controller/planner.controller";
import { PlannerRepository } from "./infrastructure/planner.repository";
import { PlannerRepositoryInterface } from "./interface/planner-repository.interface";
import { PlannerService } from "./service/planner.service";
import { GetMeUseCase } from "./use-cases/get-me.use-case";
import { GetPlannerBlocksUseCase } from "./use-cases/get-planner-blocks.use-case";
import { GetPlannersUseCase } from "./use-cases/get-planners.use-case";

/**
 * planner 도메인 모듈 (Phase δ — read 3건).
 *
 * `DatabaseModule`(autoLoadEntities: true)이 forFeature 엔티티를 루트 연결에 합류시킨다.
 * `DATABASE_ENABLED=true` 일 때만 app.module 에서 import 된다(DB 필요). 컨트롤러는 `@Public()`
 * 이라 미인증이면 데모 사용자로 폴백한다 — 인증 필수 전환은 Phase 3(GATED).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Planner,
      PlannerSubjectUnit,
      TimeBlock,
      BlockCompletion,
      DomainUser,
    ]),
  ],
  controllers: [MeController, PlannerController, BlocksController],
  providers: [
    { provide: PlannerRepositoryInterface, useClass: PlannerRepository },
    PlannerService,
    GetMeUseCase,
    GetPlannersUseCase,
    GetPlannerBlocksUseCase,
  ],
})
export class PlannerModule {}
