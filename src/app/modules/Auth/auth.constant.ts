export const USER_ROLE = {
  student: 'student',
  teacher: 'teacher',
  parent: 'parent',
  admin: 'admin',
  superAdmin: 'superAdmin',
} as const;

export type TUserRole = keyof typeof USER_ROLE;
export const UserStatus = ['active', 'blocked'];