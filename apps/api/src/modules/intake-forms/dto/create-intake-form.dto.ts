import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export class IntakeQuestionDto {
  @IsString()
  @IsNotEmpty()
  id!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question!: string

  @IsIn(['text', 'textarea', 'radio', 'checkbox', 'select'])
  type!: string

  @IsBoolean()
  required!: boolean

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[]
}

export class CreateIntakeFormDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntakeQuestionDto)
  questions!: IntakeQuestionDto[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[]

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
