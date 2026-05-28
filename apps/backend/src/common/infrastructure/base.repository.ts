import {
  DeepPartial,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from "typeorm";
import { BaseRepositoryInterface } from "../interfaces/base-repository.interface";

export abstract class BaseRepository<
  T extends ObjectLiteral,
> implements BaseRepositoryInterface<T> {
  constructor(protected readonly repository: Repository<T>) {}

  /**
   * ID로 엔티티를 조회한다.
   * @param id - 엔티티 고유 식별자
   * @returns 엔티티 또는 null
   */
  async findById(id: string): Promise<T | null> {
    return this.repository.findOneBy({
      id,
    } as unknown as FindOptionsWhere<T>);
  }

  /**
   * 조건에 맞는 엔티티 하나를 조회한다.
   * @param where - 검색 조건
   * @returns 엔티티 또는 null
   */
  async findOne(where: FindOptionsWhere<T>): Promise<T | null> {
    return this.repository.findOneBy(where);
  }

  /**
   * 모든 엔티티를 조회한다.
   * @returns 엔티티 배열
   */
  async findAll(): Promise<T[]> {
    return this.repository.find();
  }

  /**
   * 엔티티를 저장한다. 신규 생성 또는 기존 엔티티 업데이트에 사용한다.
   * @param entity - 저장할 엔티티
   * @returns 저장된 엔티티
   */
  async save(entity: DeepPartial<T>): Promise<T> {
    return this.repository.save(entity);
  }

  /**
   * ID로 엔티티를 삭제한다.
   * @param id - 삭제할 엔티티의 고유 식별자
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
