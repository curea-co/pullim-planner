import type { BlockCompletion } from "../../../../entities/block-completion.entity";
import type { TimeBlock } from "../../../../entities/time-block.entity";

/**
 * `GET /api/planners/:id/blocks` 항목 — FE mock `TimeBlock` shape.
 *
 * 시각은 `HH:MM:SS`(DB time) → `HH:MM`(mock). 완료 정보(accuracy/emotion)는
 * block_completions 조인. 선택 필드(linkedFeatureSlug/curriculumNodeId/accuracy/emotion/
 * reasoning)는 값이 없으면 키 자체를 생략한다(mock 과 동일한 직렬화).
 */
export class BlockResponseDto {
  id: string;
  start: string;
  end: string;
  subject: string;
  type: string;
  title: string;
  linkedFeatureSlug?: string;
  curriculumNodeId?: string;
  engines: string[];
  progress: number;
  status: string;
  expectedMinutes: number;
  accuracy?: number;
  emotion?: number;
  reasoning?: string;

  static from(
    block: TimeBlock,
    completion?: BlockCompletion,
  ): BlockResponseDto {
    const dto = new BlockResponseDto();
    dto.id = block.id;
    dto.start = block.startTime.slice(0, 5);
    dto.end = block.endTime.slice(0, 5);
    dto.subject = block.subject;
    dto.type = block.type;
    dto.title = block.title;
    dto.engines = block.engines;
    dto.progress = block.progress;
    dto.status = block.status;
    dto.expectedMinutes = block.expectedMinutes;

    if (block.linkedFeatureSlug)
      dto.linkedFeatureSlug = block.linkedFeatureSlug;
    if (block.curriculumNodeId) dto.curriculumNodeId = block.curriculumNodeId;
    if (block.reasoning) dto.reasoning = block.reasoning;
    if (completion?.accuracy != null) dto.accuracy = completion.accuracy;
    if (completion?.emotion != null) dto.emotion = completion.emotion;
    return dto;
  }
}
