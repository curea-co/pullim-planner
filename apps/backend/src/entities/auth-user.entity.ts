import { Exclude, Expose, Transform } from "class-transformer";
import { DateTime } from "luxon";
import { Column, Entity, Index, OneToMany } from "typeorm";

import { BaseModel } from "../common/entities/base.model";
import {
  DateTimeTransformer,
  dateTimeToIso,
} from "../common/utils/datetime.util";
import { AuthUserProvider } from "./auth-user-provider.entity";
import { UserRole } from "./enums/user-role.enum";

export { UserRole } from "./enums/user-role.enum";

/**
 * 인증 주체 엔티티.
 *
 * 테이블명은 `auth_users` — pullim_planner DB 가 이미 보유한 Drizzle 시대 도메인
 * `users`(id text, grade/track 등) 와 충돌을 피하기 위함. 본체 pullim `User` 시그니처를
 * 정렬해 향후 흡수 시 컬럼 충돌을 최소화한다.
 *
 * 비밀번호는 본 엔티티가 아닌 `auth_user_providers.password`(EMAIL 제공자)에만 저장한다.
 * 날짜 필드는 planner `BaseModel` 규약대로 Luxon `DateTime` 을 쓴다 (Q 의 `Date` 와 다름).
 */
@Entity("auth_users")
export class AuthUser extends BaseModel {
  @Column({ comment: "회원 이름" })
  @Expose()
  name: string;

  // soft delete 재가입을 허용하기 위해 unique 는 마이그레이션의 partial index 로 건다
  // (deleted_at IS NULL). 엔티티 레벨 @Index unique 는 partial 조건을 표현하지 못하므로
  // 여기서는 일반 인덱스만 두고 유니크는 마이그레이션이 소유한다.
  @Index("idx_auth_users_email")
  @Column({ comment: "이메일 (로그인 식별자)" })
  @Expose()
  email: string;

  @Column({ type: "varchar", length: 20, nullable: true, comment: "전화번호" })
  @Expose()
  phone: string | null;

  @Column({ type: "text", nullable: true, comment: "프로필 이미지 URL" })
  @Expose()
  profileImage: string | null;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
    comment: "역할 (user/admin)",
  })
  @Expose()
  role: UserRole;

  @Column({
    type: "boolean",
    default: false,
    comment: "이메일 인증 완료 여부",
  })
  @Expose()
  isEmailVerified: boolean;

  @Column({
    type: "boolean",
    default: false,
    comment: "마케팅 수신 동의 여부",
  })
  @Expose()
  marketingConsent: boolean;

  @Column({
    type: "timestamptz",
    nullable: true,
    transformer: DateTimeTransformer,
    comment: "마지막 비밀번호 변경 시각 (세션 무효화 기준)",
  })
  @Transform(dateTimeToIso, { toPlainOnly: true })
  @Exclude()
  passwordChangedAt: DateTime | null;

  @OneToMany(() => AuthUserProvider, (provider) => provider.user, {
    cascade: true,
  })
  @Exclude()
  authProviders: AuthUserProvider[];

  /**
   * AuthUser 엔티티를 생성한다. 비밀번호는 provider 에 별도로 저장한다.
   * @param params - name·email·phone·profileImage·role·marketingConsent
   * @returns 저장 직전 상태의 AuthUser 엔티티
   */
  static create(params: {
    name: string;
    email: string;
    phone?: string | null;
    profileImage?: string | null;
    role?: UserRole;
    marketingConsent?: boolean;
  }): AuthUser {
    const user = new AuthUser();
    user.name = params.name;
    user.email = params.email;
    user.phone = params.phone ?? null;
    user.profileImage = params.profileImage ?? null;
    user.role = params.role ?? UserRole.USER;
    user.isEmailVerified = false;
    user.marketingConsent = params.marketingConsent ?? false;
    user.passwordChangedAt = null;
    return user;
  }
}
