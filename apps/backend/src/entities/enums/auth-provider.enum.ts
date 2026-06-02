/**
 * 인증 제공자. Phase 0 은 EMAIL 만 사용한다. kakao/naver 는 향후 소셜 로그인(GATED)
 * 도입 시점에 enum 확장만으로 대응할 수 있도록 미리 열거해 둔다.
 */
export enum AuthProvider {
  EMAIL = "email",
  KAKAO = "kakao",
  NAVER = "naver",
}
