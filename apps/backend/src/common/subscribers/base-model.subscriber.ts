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
 *
 * NOTE: `listenTo()`를 의도적으로 두지 않는다. TypeORM subscriber 는 `listenTo()`가
 * 반환한 **구체(concrete) 엔티티 target** 에만 매칭되는데, `BaseModel`은 `@Entity()`가
 * 아닌 추상 베이스라 이를 반환하면 상속한 concrete 엔티티에 대해 호출되지 않는다
 * (codex R10 지적). 따라서 전체 엔티티를 구독하고, 핸들러 안에서 `BaseModel` 인스턴스인
 * 경우에만 동작하도록 가드한다.
 */
@EventSubscriber()
export class BaseModelSubscriber implements EntitySubscriberInterface {
  /**
   * 엔티티 업데이트 전 updatedAt을 현재 시간으로 갱신한다.
   * `BaseModel`을 상속한 엔티티에 대해서만 동작한다.
   * @param event - TypeORM 업데이트 이벤트
   */
  beforeUpdate(event: UpdateEvent<unknown>): void {
    if (event.entity instanceof BaseModel) {
      event.entity.updatedAt = DateTime.now();
    }
  }
}
