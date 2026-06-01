import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Refresh Token 전용 가드. `JwtRefreshStrategy('jwt-refresh')` 에 위임한다. */
@Injectable()
export class JwtRefreshGuard extends AuthGuard("jwt-refresh") {}
