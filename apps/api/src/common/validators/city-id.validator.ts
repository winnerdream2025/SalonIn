import { registerDecorator, ValidationOptions } from 'class-validator'
import { WORLD_CITIES } from '@salonin/config'

export function IsSupportedCity(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSupportedCity',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && WORLD_CITIES.some((c) => c.id === value)
        },
        defaultMessage() {
          return 'cityId must be a valid city'
        },
      },
    })
  }
}
