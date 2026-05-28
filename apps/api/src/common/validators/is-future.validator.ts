import { registerDecorator, ValidationOptions } from 'class-validator'

export function IsInFuture(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isInFuture',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          const date = new Date(value as string)
          const now = new Date()
          const max = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
          return date > now && date <= max
        },
        defaultMessage() {
          return 'date must be in the future and within 90 days'
        },
      },
    })
  }
}
