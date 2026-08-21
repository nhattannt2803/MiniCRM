import api from './api';
import { Course, CourseInputDTO } from '../types/course';

export const courseService = {
  getCourses: (params?: { search?: string; status?: string; series?: string; category?: string; page?: number; limit?: number }): Promise<{ success: boolean; data: { courses: Course[]; pagination: any } }> =>
    api.get('/courses', { params }) as any,

  getCourseById: (id: string): Promise<{ success: boolean; data: Course }> =>
    api.get(`/courses/${id}`) as any,

  createCourse: (data: CourseInputDTO): Promise<{ success: boolean; data: Course }> =>
    api.post('/courses', data) as any,

  updateCourse: (id: string, data: CourseInputDTO): Promise<{ success: boolean; data: Course }> =>
    api.put(`/courses/${id}`, data) as any,

  deleteCourse: (id: string): Promise<{ success: boolean; message: string }> =>
    api.delete(`/courses/${id}`) as any,
};
