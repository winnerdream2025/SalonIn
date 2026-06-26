import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    return super.canActivate(context)
  }

  // Never throw — if JWT is missing/invalid just set req.user = undefined
  override handleRequest<T>(_err: unknown, user: T): T {
    return user
  }
}
