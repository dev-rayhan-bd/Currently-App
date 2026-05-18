export type TEditProfile = {
  image?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dob?: Date;
  schoolName?: string;
  fcmToken?: string;
};
export const UserSearchableFields = ['firstName', 'lastName', 'email', 'schoolName'];