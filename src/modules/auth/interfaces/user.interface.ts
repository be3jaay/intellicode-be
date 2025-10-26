import { UserRole as PrismaUserRole } from '@prisma/client';

// Re-export Prisma's UserRole enum
export { UserRole } from '@prisma/client';

// Type alias for better compatibility
export type UserProfile = {
  id: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  role: PrismaUserRole;
  student_number: string | null;
  section: string | null;
  profile_picture: string | null;
  is_suspended: boolean;
  suspension_reason: string | null;
  is_approved: boolean;
  approval_reason: string | null;
  created_at: Date;
  updated_at: Date;
};

export interface RequestUser {
  id: string;
  email: string;
  role: PrismaUserRole;
  fullName: string;
}
