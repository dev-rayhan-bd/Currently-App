import mongoose, { Model, Types } from "mongoose";
import { TUserRole } from "../Auth/auth.constant";

export interface TUser {
  _id?: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  fullName?: string;
  image?: string;
  email: string;
  password?: string;
  dob?: Date;
  schoolName?: string;
  googleId?: string; // For Google Classroom Login
  accessToken?: string; // For Classroom API access
    googleRefreshToken?: string;
    isClassroomConnected:boolean;
  verification?: {
    code: string | null;
    expireDate: Date | null;
  };
  status: 'active' | 'blocked'| 'pending';
  grade?: string; // Grade 10 - Science Group
lastSyncedAt?: Date;
lastActiveAt: Date;
activeClassesCount?: number;
  fcmToken?: string;
  role: TUserRole;
  isOtpVerified: boolean;
  passwordChangedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  children?: Types.ObjectId[]; 
teacherClasses?: string[];
linkCode?: string | null;
linkCodeExpires?: Date | null;

}

export interface IUserMethods {
  compareVerificationCode(userPlaneCode: string): boolean;
}

export interface User extends Model<TUser, {}, IUserMethods> {
  isUserExistsByEmail(email: string): Promise<TUser>;
  isUserExistsById(id: string): Promise<TUser>;
  isPasswordMatched(plainTextPassword: string, hashedPassword: string): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(passwordChangedTimestamp: Date, jwtIssuedTimestamp: number): boolean;
}