import { ApiProperty } from "@nestjs/swagger";

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: "항목 목록" })
  items: T[];

  @ApiProperty({ description: "현재 페이지", example: 1 })
  page: number;

  @ApiProperty({ description: "페이지당 항목 수", example: 10 })
  limit: number;

  @ApiProperty({ description: "전체 항목 수", example: 100 })
  totalCount: number;

  @ApiProperty({ description: "전체 페이지 수", example: 10 })
  totalPages: number;

  /**
   * 페이지네이션 응답 DTO를 생성하는 팩토리 메서드
   * @param params - 페이지네이션 데이터
   * @returns PaginatedResponseDto 인스턴스
   */
  static from<T>(params: {
    items: T[];
    page: number;
    limit: number;
    totalCount: number;
  }): PaginatedResponseDto<T> {
    const dto = new PaginatedResponseDto<T>();
    dto.items = params.items;
    dto.page = params.page;
    dto.limit = params.limit;
    dto.totalCount = params.totalCount;
    dto.totalPages = Math.ceil(params.totalCount / params.limit);
    return dto;
  }
}
