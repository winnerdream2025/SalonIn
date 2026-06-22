import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { MediaService } from './media.service'
import { UploadMediaDto } from './dto/upload-media.dto'

const ALLOWED_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  // Videos
  'video/mp4',
  'video/quicktime',
  'video/mpeg',
  'video/webm',
  // Audio
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/mp4',
  'audio/mpeg',
  'audio/webm',
  'audio/ogg',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 100 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
          cb(null, true)
        } else {
          cb(
            new BadRequestException(
              `File type "${file.mimetype}" is not allowed. Accepted: jpg, png, webp, mp4, mov, m4a, aac, mp3, pdf, doc, docx, xls, xlsx, txt, csv`,
            ),
            false,
          )
        }
      },
    }),
  )
  upload(
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true }))
    file: Express.Multer.File,
    @Query() query: UploadMediaDto,
  ): Promise<{ url: string }> {
    return this.mediaService.uploadFile(file, query.folder)
  }
}
