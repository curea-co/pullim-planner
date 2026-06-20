import { redirect } from 'next/navigation';

/**
 * 흡수 전환 §10 — 자체 회원가입 폐기.
 *
 * 가입 권위는 **중앙**(pullim-api `/auth/signup`, KCB 본인인증)이다. dev 는 KCB 강제라 self-service
 * 합성 가입이 불가하고(테스트 계정은 `seed-member`), 자체 BE 가입은 pullim 쿠키 세션과 신원
 * 저장소가 갈려 로그인이 성립하지 않는다. 그래서 `/signup` 은 `/login` 으로 리다이렉트한다.
 * 중앙 가입 플로우(KCB 단계형) 배선은 후속.
 */
export default function SignupPage() {
  redirect('/login');
}
