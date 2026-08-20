import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { CourseService } from '../services/CourseService';

export const listCourses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bizId = req.bizId!;
    const { search, status, series, category, page, limit } = req.query;

    const result = await CourseService.listCourses(bizId, {
      search: search ? String(search) : undefined,
      status: status ? String(status) : undefined,
      series: series ? String(series) : undefined,
      category: category ? String(category) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getCourseById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bizId = req.bizId!;
    const courseId = BigInt(req.params.id);

    const course = await CourseService.getCourseById(bizId, courseId);
    res.json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
};

export const createCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bizId = req.bizId!;
    const dto = req.body;

    const course = await CourseService.createCourse(bizId, dto);
    res.status(201).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
};

export const updateCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bizId = req.bizId!;
    const courseId = BigInt(req.params.id);
    const dto = req.body;

    const course = await CourseService.updateCourse(bizId, courseId, dto);
    res.json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
};

export const deleteCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bizId = req.bizId!;
    const courseId = BigInt(req.params.id);

    const result = await CourseService.deleteCourse(bizId, courseId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
