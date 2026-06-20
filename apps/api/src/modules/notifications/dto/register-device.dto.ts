import { IsIn, IsString, MaxLength, Matches } from 'class-validator'

export class RegisterDeviceDto {
  @IsString()
  @MaxLength(200)
  @Matches(/^ExponentPushToken\[.+\]$/, { message: 'Invalid Expo push token format' })
  expoPushToken!: string

  @IsIn(['IOS', 'ANDROID'])
  platform!: 'IOS' | 'ANDROID'
}
