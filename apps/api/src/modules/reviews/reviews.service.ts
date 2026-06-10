import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateReviewDto } from './dto/create-review.dto'
import type { ReviewCardData, CanReviewResponse } from '@salonin/types'

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async canReview(authorId: string, subjectId: string): Promise<CanReviewResponse> {
    if (authorId === subjectId) {
      return { canReview: false, existingReview: null }
    }

    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, role: true },
    })
    const subject = await this.prisma.user.findUnique({
      where: { id: subjectId },
      select: { id: true, role: true },
    })
    if (!author || !subject) return { canReview: false, existingReview: null }

    // Check existing review
    const existing = await this.prisma.review.findUnique({
      where: { authorId_subjectId: { authorId, subjectId } },
      include: { author: { select: { id: true, role: true, workerProfile: { select: { name: true, photoUrl: true } }, salonProfile: { select: { name: true, photoUrls: true } } } } },
    })

    if (existing) {
      return {
        canReview: false,
        existingReview: this.toCard(existing),
      }
    }

    // Worker reviewing Salon: must have applied to one of the salon's jobs
    if (author.role === 'WORKER' && subject.role === 'SALON') {
      const salonProfile = await this.prisma.salonProfile.findUnique({
        where: { userId: subjectId },
        select: { id: true },
      })
      if (!salonProfile) return { canReview: false, existingReview: null }
      const workerProfile = await this.prisma.workerProfile.findUnique({
        where: { userId: authorId },
        select: { id: true },
      })
      if (!workerProfile) return { canReview: false, existingReview: null }
      const application = await this.prisma.jobApplication.findFirst({
        where: { workerId: workerProfile.id, job: { salonId: salonProfile.id }, status: 'ACCEPTED' },
      })
      return { canReview: !!application, existingReview: null }
    }

    // Salon reviewing Worker: must have accepted an application from that worker
    if (author.role === 'SALON' && subject.role === 'WORKER') {
      const salonProfile = await this.prisma.salonProfile.findUnique({
        where: { userId: authorId },
        select: { id: true },
      })
      if (!salonProfile) return { canReview: false, existingReview: null }
      const workerProfile = await this.prisma.workerProfile.findUnique({
        where: { userId: subjectId },
        select: { id: true },
      })
      if (!workerProfile) return { canReview: false, existingReview: null }
      const application = await this.prisma.jobApplication.findFirst({
        where: { workerId: workerProfile.id, job: { salonId: salonProfile.id }, status: 'ACCEPTED' },
      })
      return { canReview: !!application, existingReview: null }
    }

    return { canReview: false, existingReview: null }
  }

  async create(authorId: string, dto: CreateReviewDto): Promise<ReviewCardData> {
    if (authorId === dto.subjectId) {
      throw new BadRequestException('Cannot review yourself')
    }

    const subject = await this.prisma.user.findUnique({
      where: { id: dto.subjectId },
      select: { id: true, role: true },
    })
    if (!subject) throw new NotFoundException('User not found')

    const eligibility = await this.canReview(authorId, dto.subjectId)
    if (eligibility.existingReview) {
      throw new BadRequestException('You have already reviewed this user')
    }
    if (!eligibility.canReview) {
      throw new ForbiddenException('You can only review someone you have worked with')
    }

    const review = await this.prisma.review.create({
      data: {
        authorId,
        subjectId: dto.subjectId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      },
      include: {
        author: {
          select: {
            id: true,
            role: true,
            workerProfile: { select: { name: true, photoUrl: true } },
            salonProfile: { select: { name: true, photoUrls: true } },
          },
        },
      },
    })

    // Recalculate and persist subject's rating
    await this.recalcRating(dto.subjectId, subject.role)

    return this.toCard(review)
  }

  async deleteReview(reviewId: string, userId: string, userRole: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { subject: { select: { id: true, role: true } } },
    })
    if (!review) throw new NotFoundException('Review not found')
    if (review.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only the reviewer or an admin can delete this review')
    }
    await this.prisma.review.delete({ where: { id: reviewId } })
    await this.recalcRating(review.subjectId, review.subject.role)
  }

  async replyToReview(reviewId: string, userId: string, text: string): Promise<ReviewCardData> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        author: {
          select: {
            id: true, role: true,
            workerProfile: { select: { name: true, photoUrl: true } },
            salonProfile: { select: { name: true, photoUrls: true } },
          },
        },
      },
    })
    if (!review) throw new NotFoundException('Review not found')
    if (review.subjectId !== userId) {
      throw new ForbiddenException('Only the reviewed party can reply')
    }
    if (review.reply) {
      throw new BadRequestException('A reply already exists for this review')
    }
    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { reply: text.trim(), repliedAt: new Date() },
      include: {
        author: {
          select: {
            id: true, role: true,
            workerProfile: { select: { name: true, photoUrl: true } },
            salonProfile: { select: { name: true, photoUrls: true } },
          },
        },
      },
    })
    return this.toCard(updated)
  }

  async getForUser(
    subjectId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: ReviewCardData[]; total: number; hasMore: boolean }> {
    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { subjectId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              role: true,
              workerProfile: { select: { name: true, photoUrl: true } },
              salonProfile: { select: { name: true, photoUrls: true } },
            },
          },
        },
      }),
      this.prisma.review.count({ where: { subjectId } }),
    ])

    return {
      data: rows.map((r) => this.toCard(r)),
      total,
      hasMore: page * limit < total,
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async recalcRating(userId: string, role: string): Promise<void> {
    const agg = await this.prisma.review.aggregate({
      where: { subjectId: userId },
      _avg: { rating: true },
      _count: { rating: true },
    })
    const avg = agg._avg.rating ?? 0
    const count = agg._count.rating

    if (role === 'WORKER') {
      const wp = await this.prisma.workerProfile.findUnique({ where: { userId } })
      if (wp) await this.prisma.workerProfile.update({ where: { id: wp.id }, data: { rating: avg, reviewCount: count } })
    } else if (role === 'SALON') {
      const sp = await this.prisma.salonProfile.findUnique({ where: { userId } })
      if (sp) await this.prisma.salonProfile.update({ where: { id: sp.id }, data: { rating: avg, reviewCount: count } })
    }
  }

  private toCard(review: {
    id: string
    rating: number
    comment: string | null
    reply: string | null
    repliedAt: Date | null
    authorId: string
    subjectId: string
    createdAt: Date
    author: {
      id: string
      role: string
      workerProfile: { name: string; photoUrl: string | null } | null
      salonProfile: { name: string; photoUrls: string[] } | null
    }
  }): ReviewCardData {
    const a = review.author
    const name = a.workerProfile?.name ?? a.salonProfile?.name ?? 'Unknown'
    const photoUrl = a.workerProfile?.photoUrl ?? a.salonProfile?.photoUrls[0] ?? null
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      reply: review.reply,
      repliedAt: review.repliedAt?.toISOString() ?? null,
      authorId: review.authorId,
      subjectId: review.subjectId,
      authorName: name,
      authorPhotoUrl: photoUrl,
      authorRole: a.role as 'WORKER' | 'SALON' | 'ADMIN',
      createdAt: review.createdAt.toISOString(),
    }
  }
}
