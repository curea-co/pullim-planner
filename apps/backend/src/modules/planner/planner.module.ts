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
import { PlannerMutationController } from "./controller/planner-mutation.controller";
import { PlannerRepository } from "./infrastructure/planner.repository";
import { PlannerRepositoryInterface } from "./interface/planner-repository.interface";
import { PlannerService } from "./service/planner.service";
import { ActivatePlannerUseCase } from "./use-cases/activate-planner.use-case";
import { ArchivePlannerUseCase } from "./use-cases/archive-planner.use-case";
import { CreatePlannerUseCase } from "./use-cases/create-planner.use-case";
import { DeletePlannerUseCase } from "./use-cases/delete-planner.use-case";
import { DuplicatePlannerUseCase } from "./use-cases/duplicate-planner.use-case";
import { GetMeUseCase } from "./use-cases/get-me.use-case";
import { GetPlannerBlocksUseCase } from "./use-cases/get-planner-blocks.use-case";
import { GetPlannersUseCase } from "./use-cases/get-planners.use-case";
import { UpdateCustomizationUseCase } from "./use-cases/update-customization.use-case";
import { UpdatePlannerUseCase } from "./use-cases/update-planner.use-case";

/**
 * planner 도메인 모듈 (Phase δ read 3건 + Phase ε mutation 8 라우트).
 *
 * `DatabaseModule`(autoLoadEntities: true)이 forFeature 엔티티를 루트 연결에 합류시킨다.
 * `DATABASE_ENABLED=true` 일 때만 app.module 에서 import 된다(DB 필요).
 *
 * read 컨트롤러(Me/Planner/Blocks)는 `@Public()` 데모 폴백, mutation 컨트롤러는 인증 필수
 * (전역 JwtAuthGuard 가 토큰 강제 → per-user write).
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
  controllers: [
    MeController,
    PlannerController,
    BlocksController,
    PlannerMutationController,
  ],
  providers: [
    { provide: PlannerRepositoryInterface, useClass: PlannerRepository },
    PlannerService,
    GetMeUseCase,
    GetPlannersUseCase,
    GetPlannerBlocksUseCase,
    CreatePlannerUseCase,
    UpdatePlannerUseCase,
    DeletePlannerUseCase,
    ActivatePlannerUseCase,
    ArchivePlannerUseCase,
    DuplicatePlannerUseCase,
    UpdateCustomizationUseCase,
  ],
})
export class PlannerModule {}
