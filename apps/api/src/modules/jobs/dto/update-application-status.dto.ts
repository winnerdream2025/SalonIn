import { IsIn } from 'class-validator'
import type { AppStatus } from '@prisma/client'

export class UpdateApplicationStatusDto {
  @IsIn(['VIEWED', 'ACCEPTED', 'DECLINED'])
  status!: AppStatus
}
