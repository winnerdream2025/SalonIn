import { IsIn, IsString } from 'class-validator'

export class RegisterDeviceDto {
  @IsString()
  expoPushToken!: string

  @IsIn(['IOS', 'ANDROID'])
  platform!: 'IOS' | 'ANDROID'
}
