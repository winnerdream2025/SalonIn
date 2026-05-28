import { registerDecorator, ValidationOptions } from 'class-validator'
import { SUPPORTED_CITIES } from '@salonin/config'

export function IsSupportedCity(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSupportedCity',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && Object.keys(SUPPORTED_CITIES).includes(value)
        },
        defaultMessage() {
          return 'cityId must be a supported city'
        },
      },
    })
  }
}
