export interface CourseSession {
  id?: string;
  title: string;
  isActive: boolean;
  sortOrder?: number;
  startTime?: string | null;
  endTime?: string | null;
  description?: string | null;
  location?: string | null;
}

export interface CourseTicket {
  id?: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  quantity?: number | null;
  soldCount?: number;
  isActive: boolean;
  sortOrder?: number;
  description?: string | null;
}

export interface CoursePromotion {
  id?: string;
  name: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  code?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  sortOrder?: number;
}

export interface Course {
  id: string;
  bizId: string;
  title: string;
  thumbnail?: string | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
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
  registrationsCount: number;
  maxCapacity?: number | null;
  hotline?: string | null;
  createdAt: string;
  updatedAt: string;
  sessions?: CourseSession[];
  tickets?: CourseTicket[];
  promotions?: CoursePromotion[];
}

export interface CourseInputDTO {
  title: string;
  thumbnail?: string | null;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
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
  sessions?: CourseSession[];
  tickets?: CourseTicket[];
  promotions?: CoursePromotion[];
}
