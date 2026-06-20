import { IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class AutocompleteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  input!: string
}

export class PlaceDetailsDto {
  @IsString()
  @MaxLength(300)
  placeId!: string
}

export class ReverseGeocodeDto {
  @Transform(({ value }: { value: unknown }) => parseFloat(value as string))
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number

  @Transform(({ value }: { value: unknown }) => parseFloat(value as string))
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number
}
