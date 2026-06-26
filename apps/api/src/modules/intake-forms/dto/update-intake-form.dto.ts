import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { IntakeQuestionDto } from './create-intake-form.dto'

export class UpdateIntakeFormDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntakeQuestionDto)
  questions?: IntakeQuestionDto[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[]

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
