import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { randomUUID } from 'crypto'
import { extname } from 'path'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_BYTES = 50 * 1024 * 1024

@Injectable()
export class MediaService {
  private readonly s3: S3Client
  private readonly bucket: string
  private readonly region: string

  constructor(config: ConfigService) {
    this.region = config.getOrThrow<string>('AWS_REGION')
    this.bucket = config.getOrThrow<string>('AWS_S3_BUCKET')
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    })
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<{ url: string }> {
    this.validateSize(file)

    let buffer = file.buffer
    let contentType = file.mimetype
    let ext = extname(file.originalname).toLowerCase()

    if (this.isImage(file.mimetype)) {
      const processed = await this.processImage(buffer, folder)
      buffer = processed.buffer
      contentType = processed.contentType
      ext = processed.ext
    }

    const key = `${folder}/${randomUUID()}${ext}`

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    )

    return { url: this.buildUrl(key) }
  }

  private validateSize(file: Express.Multer.File): void {
    if (this.isImage(file.mimetype) && file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Image exceeds the 10 MB limit')
    }
    if (this.isVideo(file.mimetype) && file.size > MAX_VIDEO_BYTES) {
      throw new BadRequestException('Video exceeds the 50 MB limit')
    }
  }

  private async processImage(
    buffer: Buffer,
    folder: string,
  ): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
    const isAvatar = folder === 'avatars'
    const image = sharp(buffer)

    const processed = isAvatar
      ? image.resize(200, 200, { fit: 'cover' }).webp({ quality: 85 })
      : image.resize(800, undefined, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 })

    return {
      buffer: await processed.toBuffer(),
      contentType: isAvatar ? 'image/webp' : 'image/jpeg',
      ext: isAvatar ? '.webp' : '.jpg',
    }
  }

  private isImage(mimetype: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(mimetype)
  }

  private isVideo(mimetype: string): boolean {
    return ALLOWED_VIDEO_TYPES.includes(mimetype)
  }

  private buildUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`
  }
}
