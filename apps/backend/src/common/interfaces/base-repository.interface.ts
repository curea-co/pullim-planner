import { DeepPartial, FindOptionsWhere } from "typeorm";

export abstract class BaseRepositoryInterface<T> {
  abstract findById(id: string): Promise<T | null>;
  abstract findOne(where: FindOptionsWhere<T>): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract save(entity: DeepPartial<T>): Promise<T>;
  abstract delete(id: string): Promise<void>;
}
