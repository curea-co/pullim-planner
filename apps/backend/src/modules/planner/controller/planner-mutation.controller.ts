import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { getCurrentUserId } from "../../../common/utils/request.util";
import { CustomizationDto } from "./dto/customization.dto";
import { PlannerResponseDto } from "./dto/planner-response.dto";
import { PlannerWriteDto } from "./dto/planner-write.dto";
import { ActivatePlannerUseCase } from "../use-cases/activate-planner.use-case";
import { ArchivePlannerUseCase } from "../use-cases/archive-planner.use-case";
import { CreatePlannerUseCase } from "../use-cases/create-planner.use-case";
import { DeletePlannerUseCase } from "../use-cases/delete-planner.use-case";
import { DuplicatePlannerUseCase } from "../use-cases/duplicate-planner.use-case";
import { UpdateCustomizationUseCase } from "../use-cases/update-customization.use-case";
import { UpdatePlannerUseCase } from "../use-cases/update-planner.use-case";

/**
 * 시간표(플래너) 변경 — Phase ε mutation 8 라우트.
 *
 * read 컨트롤러와 달리 **인증 필수**(`@Public()` 없음): 전역 `JwtAuthGuard` 가 토큰을
 * 강제하고 `getCurrentUserId(req)` 는 `req.user.id`(=로그인 사용자)를 반환한다 → 변경은
 * 항상 본인 소유 플래너에만 적용된다(per-user write). 토큰이 없으면 가드가 401.
 */
@ApiTags("planner")
@Controller("planners")
export class PlannerMutationController {
  constructor(
    private readonly createPlanner: CreatePlannerUseCase,
    private readonly updatePlanner: UpdatePlannerUseCase,
    private readonly deletePlanner: DeletePlannerUseCase,
    private readonly activatePlanner: ActivatePlannerUseCase,
    private readonly archivePlanner: ArchivePlannerUseCase,
    private readonly duplicatePlanner: DuplicatePlannerUseCase,
    private readonly updateCustomization: UpdateCustomizationUseCase,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "시간표 생성" })
  create(
    @Req() req: Request,
    @Body() dto: PlannerWriteDto,
  ): Promise<PlannerResponseDto> {
    return this.createPlanner.execute(getCurrentUserId(req), dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "시간표 수정(편집 필드 전체 교체)" })
  update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: PlannerWriteDto,
  ): Promise<PlannerResponseDto> {
    return this.updatePlanner.execute(getCurrentUserId(req), id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "시간표 삭제(활성 플래너는 불가)" })
  remove(@Req() req: Request, @Param("id") id: string): Promise<void> {
    return this.deletePlanner.execute(getCurrentUserId(req), id);
  }

  @Post(":id/activate")
  @HttpCode(200)
  @ApiOperation({ summary: "활성 시간표 전환(타 플래너 비활성)" })
  activate(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<PlannerResponseDto> {
    return this.activatePlanner.execute(getCurrentUserId(req), id);
  }

  @Post(":id/archive")
  @HttpCode(200)
  @ApiOperation({ summary: "시간표 아카이브(활성 플래너는 불가)" })
  archive(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<PlannerResponseDto> {
    return this.archivePlanner.archive(getCurrentUserId(req), id);
  }

  @Post(":id/unarchive")
  @HttpCode(200)
  @ApiOperation({ summary: "시간표 아카이브 해제" })
  unarchive(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<PlannerResponseDto> {
    return this.archivePlanner.unarchive(getCurrentUserId(req), id);
  }

  @Post(":id/duplicate")
  @HttpCode(201)
  @ApiOperation({ summary: "시간표 복제" })
  duplicate(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<PlannerResponseDto> {
    return this.duplicatePlanner.execute(getCurrentUserId(req), id);
  }

  @Put(":id/customization")
  @ApiOperation({ summary: "시간표 꾸미기(레이아웃·팔레트) 저장" })
  customize(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: CustomizationDto,
  ): Promise<PlannerResponseDto> {
    return this.updateCustomization.execute(
      getCurrentUserId(req),
      id,
      dto.customization as unknown as Record<string, unknown>,
    );
  }
}
