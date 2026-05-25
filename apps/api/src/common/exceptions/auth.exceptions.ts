import { HttpException, HttpStatus } from '@nestjs/common'

export class InvalidCredentialsException extends HttpException {
  constructor() {
    super('Invalid email or password', HttpStatus.UNAUTHORIZED)
  }
}

export class UserAlreadyExistsException extends HttpException {
  constructor() {
    super('A user with this email already exists', HttpStatus.CONFLICT)
  }
}

export class TokenBlacklistedException extends HttpException {
  constructor() {
    super('Token has been invalidated', HttpStatus.UNAUTHORIZED)
  }
}
