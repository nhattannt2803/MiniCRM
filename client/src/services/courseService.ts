import api from './api';
import { Course, CourseInputDTO } from '../types/course';

export const courseService = {
  getCourses: (params?: { search?: string; status?: string; series?: string; category?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: { courses: Course[]; pagination: any } }>('/courses', { params }),

  getCourseById: (id: string) =>
    api.get<{ success: boolean; data: Course }>(`/courses/${id}`),

  createCourse: (data: CourseInputDTO) =>
    api.post<{ success: boolean; data: Course }>('/courses', data),

  updateCourse: (id: string, data: CourseInputDTO) =>
    api.put<{ success: boolean; data: Course }>(`/courses/${id}`, data),

  deleteCourse: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/courses/${id}`),
};
