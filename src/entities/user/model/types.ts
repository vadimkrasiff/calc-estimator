export type UserRole = 'user' | 'admin';

export const UserRoleValues = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export const UserRole = UserRoleValues satisfies Record<keyof typeof UserRoleValues, UserRole>;

export interface User {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}
