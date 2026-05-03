import mongoose, { Model } from "mongoose";
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
  verification?: {
    code: string | null;
    expireDate: Date | null;
  };
  status: 'in-progress' | 'blocked';
  fcmToken?: string;
  role: TUserRole;
  isOtpVerified: boolean;
  passwordChangedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
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