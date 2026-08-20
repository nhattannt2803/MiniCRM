import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';

export interface CreateCourseSessionDTO {
  title: string;
  isActive?: boolean;
  sortOrder?: number;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  description?: string | null;
  location?: string | null;
}

export interface CreateCourseTicketDTO {
  name: string;
  price?: number;
  originalPrice?: number | null;
  quantity?: number | null;
  isActive?: boolean;
  sortOrder?: number;
  description?: string | null;
}

export interface CreateCoursePromotionDTO {
  name: string;
  discountType?: string;
  discountValue?: number;
  code?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CourseDTO {
  title: string;
  thumbnail?: string | null;
  status?: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  shortDescription?: string | null;
  description?: string | null;
  series?: string | null;
  programType?: string | null;
  category?: string | null;
  speaker?: string | null;
  district?: string | null;
  ward?: string | null;
  addressDetail?: string | null;
  priceType?: string | null;
  registrationsCount?: number;
  maxCapacity?: number | null;
  hotline?: string | null;
  sessions?: CreateCourseSessionDTO[];
  tickets?: CreateCourseTicketDTO[];
  promotions?: CreateCoursePromotionDTO[];
}

export class CourseService {
  /**
   * List courses with filtering, pagination, and sorting
   */
  static async listCourses(
    bizId: bigint,
    params: {
      search?: string;
      status?: string;
      series?: string;
      category?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      bizId,
      deletedAt: null,
    };

    if (params.search) {
      where.OR = [
        { title: { contains: params.search } },
        { shortDescription: { contains: params.search } },
        { speaker: { contains: params.search } },
      ];
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.series) {
      where.series = params.series;
    }

    if (params.category) {
      where.category = params.category;
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sessions: {
            orderBy: { sortOrder: 'asc' },
          },
          tickets: {
            orderBy: { sortOrder: 'asc' },
          },
          promotions: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      prisma.course.count({ where }),
    ]);

    return {
      courses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single course details by ID
   */
  static async getCourseById(bizId: bigint, courseId: bigint) {
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        bizId,
        deletedAt: null,
      },
      include: {
        sessions: {
          orderBy: { sortOrder: 'asc' },
        },
        tickets: {
          orderBy: { sortOrder: 'asc' },
        },
        promotions: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!course) {
      throw new AppError('Khóa học không tồn tại hoặc đã bị xóa', 404);
    }

    return course;
  }

  /**
   * Create a new course transactionally with sessions, tickets, and promotions
   */
  static async createCourse(bizId: bigint, dto: CourseDTO) {
    if (!dto.title || !dto.title.trim()) {
      throw new AppError('Tên khóa học không được để trống', 400);
    }

    return await prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          bizId,
          title: dto.title.trim(),
          thumbnail: dto.thumbnail || null,
          status: dto.status || 'ACTIVE',
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          shortDescription: dto.shortDescription || null,
          description: dto.description || null,
          series: dto.series || null,
          programType: dto.programType || null,
          category: dto.category || null,
          speaker: dto.speaker || null,
          district: dto.district || null,
          ward: dto.ward || null,
          addressDetail: dto.addressDetail || null,
          priceType: dto.priceType || 'FULL',
          registrationsCount: dto.registrationsCount || 0,
          maxCapacity: dto.maxCapacity || null,
          hotline: dto.hotline || null,
        },
      });

      // Create Sessions if provided
      if (dto.sessions && dto.sessions.length > 0) {
        await tx.courseSession.createMany({
          data: dto.sessions.map((s, index) => ({
            bizId,
            courseId: course.id,
            title: s.title || `Buổi ${index + 1}`,
            isActive: s.isActive !== undefined ? s.isActive : true,
            sortOrder: s.sortOrder !== undefined ? s.sortOrder : index + 1,
            startTime: s.startTime ? new Date(s.startTime) : null,
            endTime: s.endTime ? new Date(s.endTime) : null,
            description: s.description || null,
            location: s.location || null,
          })),
        });
      }

      // Create Tickets if provided
      if (dto.tickets && dto.tickets.length > 0) {
        await tx.courseTicket.createMany({
          data: dto.tickets.map((t, index) => ({
            bizId,
            courseId: course.id,
            name: t.name || `Vé ${index + 1}`,
            price: t.price || 0,
            originalPrice: t.originalPrice || null,
            quantity: t.quantity || null,
            isActive: t.isActive !== undefined ? t.isActive : true,
            sortOrder: t.sortOrder !== undefined ? t.sortOrder : index + 1,
            description: t.description || null,
          })),
        });
      }

      // Create Promotions if provided
      if (dto.promotions && dto.promotions.length > 0) {
        await tx.coursePromotion.createMany({
          data: dto.promotions.map((p, index) => ({
            bizId,
            courseId: course.id,
            name: p.name || `Ưu đãi ${index + 1}`,
            discountType: p.discountType || 'PERCENTAGE',
            discountValue: p.discountValue || 0,
            code: p.code || null,
            startDate: p.startDate ? new Date(p.startDate) : null,
            endDate: p.endDate ? new Date(p.endDate) : null,
            isActive: p.isActive !== undefined ? p.isActive : true,
            sortOrder: p.sortOrder !== undefined ? p.sortOrder : index + 1,
          })),
        });
      }

      return await tx.course.findUnique({
        where: { id: course.id },
        include: {
          sessions: { orderBy: { sortOrder: 'asc' } },
          tickets: { orderBy: { sortOrder: 'asc' } },
          promotions: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });
  }

  /**
   * Update course transactionally (replaces/syncs sessions, tickets, promotions)
   */
  static async updateCourse(bizId: bigint, courseId: bigint, dto: CourseDTO) {
    const existing = await prisma.course.findFirst({
      where: { id: courseId, bizId, deletedAt: null },
    });

    if (!existing) {
      throw new AppError('Khóa học không tồn tại hoặc đã bị xóa', 404);
    }

    return await prisma.$transaction(async (tx) => {
      await tx.course.update({
        where: { id: courseId },
        data: {
          title: dto.title !== undefined ? dto.title.trim() : existing.title,
          thumbnail: dto.thumbnail !== undefined ? dto.thumbnail : existing.thumbnail,
          status: dto.status !== undefined ? dto.status : existing.status,
          startDate: dto.startDate !== undefined ? (dto.startDate ? new Date(dto.startDate) : null) : existing.startDate,
          endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : existing.endDate,
          shortDescription: dto.shortDescription !== undefined ? dto.shortDescription : existing.shortDescription,
          description: dto.description !== undefined ? dto.description : existing.description,
          series: dto.series !== undefined ? dto.series : existing.series,
          programType: dto.programType !== undefined ? dto.programType : existing.programType,
          category: dto.category !== undefined ? dto.category : existing.category,
          speaker: dto.speaker !== undefined ? dto.speaker : existing.speaker,
          district: dto.district !== undefined ? dto.district : existing.district,
          ward: dto.ward !== undefined ? dto.ward : existing.ward,
          addressDetail: dto.addressDetail !== undefined ? dto.addressDetail : existing.addressDetail,
          priceType: dto.priceType !== undefined ? dto.priceType : existing.priceType,
          registrationsCount: dto.registrationsCount !== undefined ? dto.registrationsCount : existing.registrationsCount,
          maxCapacity: dto.maxCapacity !== undefined ? dto.maxCapacity : existing.maxCapacity,
          hotline: dto.hotline !== undefined ? dto.hotline : existing.hotline,
        },
      });

      // Sync Sessions
      if (dto.sessions !== undefined) {
        await tx.courseSession.deleteMany({ where: { courseId } });
        if (dto.sessions.length > 0) {
          await tx.courseSession.createMany({
            data: dto.sessions.map((s, index) => ({
              bizId,
              courseId,
              title: s.title || `Buổi ${index + 1}`,
              isActive: s.isActive !== undefined ? s.isActive : true,
              sortOrder: s.sortOrder !== undefined ? s.sortOrder : index + 1,
              startTime: s.startTime ? new Date(s.startTime) : null,
              endTime: s.endTime ? new Date(s.endTime) : null,
              description: s.description || null,
              location: s.location || null,
            })),
          });
        }
      }

      // Sync Tickets
      if (dto.tickets !== undefined) {
        await tx.courseTicket.deleteMany({ where: { courseId } });
        if (dto.tickets.length > 0) {
          await tx.courseTicket.createMany({
            data: dto.tickets.map((t, index) => ({
              bizId,
              courseId,
              name: t.name || `Vé ${index + 1}`,
              price: t.price || 0,
              originalPrice: t.originalPrice || null,
              quantity: t.quantity || null,
              isActive: t.isActive !== undefined ? t.isActive : true,
              sortOrder: t.sortOrder !== undefined ? t.sortOrder : index + 1,
              description: t.description || null,
            })),
          });
        }
      }

      // Sync Promotions
      if (dto.promotions !== undefined) {
        await tx.coursePromotion.deleteMany({ where: { courseId } });
        if (dto.promotions.length > 0) {
          await tx.coursePromotion.createMany({
            data: dto.promotions.map((p, index) => ({
              bizId,
              courseId,
              name: p.name || `Ưu đãi ${index + 1}`,
              discountType: p.discountType || 'PERCENTAGE',
              discountValue: p.discountValue || 0,
              code: p.code || null,
              startDate: p.startDate ? new Date(p.startDate) : null,
              endDate: p.endDate ? new Date(p.endDate) : null,
              isActive: p.isActive !== undefined ? p.isActive : true,
              sortOrder: p.sortOrder !== undefined ? p.sortOrder : index + 1,
            })),
          });
        }
      }

      return await tx.course.findUnique({
        where: { id: courseId },
        include: {
          sessions: { orderBy: { sortOrder: 'asc' } },
          tickets: { orderBy: { sortOrder: 'asc' } },
          promotions: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });
  }

  /**
   * Delete course (soft delete setting deletedAt timestamp)
   */
  static async deleteCourse(bizId: bigint, courseId: bigint) {
    const existing = await prisma.course.findFirst({
      where: { id: courseId, bizId, deletedAt: null },
    });

    if (!existing) {
      throw new AppError('Khóa học không tồn tại hoặc đã bị xóa', 404);
    }

    await prisma.course.update({
      where: { id: courseId },
      data: { deletedAt: new Date() },
    });

    return { success: true, message: 'Xóa khóa học thành công' };
  }
}
