import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import type { Response } from 'express'
import type { ApiError } from '@salonin/types'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let error = 'Internal server error'
    let code = 'INTERNAL_ERROR'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()
      if (typeof exceptionResponse === 'string') {
        error = exceptionResponse
      } else {
        const body = exceptionResponse as { message: string | string[] }
        error = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message
      }
      code = exception.constructor.name.replace('Exception', '').toUpperCase()
    }

    const body: ApiError = { success: false, error, code, statusCode: status }
    response.status(status).json(body)
  }
}
