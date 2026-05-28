import { DateTime } from "luxon";
import {
  EntitySubscriberInterface,
  EventSubscriber,
  UpdateEvent,
} from "typeorm";

import { BaseModel } from "../entities/base.model";

/**
 * BaseModel Subscriber
 * save()로 엔티티 업데이트 시 DateTimeTransformer가 기존 updatedAt 값을 유지하는 문제를 해결
 * updatedAt을 현재 시간으로 강제 갱신하여 @UpdateDateColumn 동작을 보장
 */
@EventSubscriber()
export class BaseModelSubscriber implements EntitySubscriberInterface<BaseModel> {
  /**
   * 이 subscriber가 구독할 엔티티 클래스를 반환한다.
   * @returns BaseModel 클래스
   */
  listenTo() {
    return BaseModel;
  }

  /**
   * 엔티티 업데이트 전 updatedAt을 현재 시간으로 갱신한다.
   * @param event - TypeORM 업데이트 이벤트
   */
  beforeUpdate(event: UpdateEvent<BaseModel>): void {
    if (event.entity) {
      event.entity.updatedAt = DateTime.now();
    }
  }
}
