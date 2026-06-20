import { IsInt, IsOptional, Max, Min } from 'class-validator'
import { Transform } from 'class-transformer'

export class ListNotificationsDto {
  @Transform(({ value }: { value: unknown }) =>
    value !== undefined ? parseInt(value as string, 10) : 1,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  page?: number
}
