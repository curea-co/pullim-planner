import { Injectable } from "@nestjs/common";

import { AuthUserService } from "../service/auth-user.service";

/** 이메일 사용 가능 여부를 확인하는 UseCase. */
@Injectable()
export class CheckEmailUseCase {
  constructor(private readonly authUserService: AuthUserService) {}

  /**
   * 이메일 사용 가능 여부를 확인한다.
   * @param email - 확인할 이메일
   * @returns 사용 가능 여부
   */
  async execute(email: string): Promise<{ available: boolean }> {
    const available = await this.authUserService.isEmailAvailable(email);
    return { available };
  }
}
