import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import { TLoginAdmin, TLoginUser } from "./auth.interface";
import { createToken, verifyToken } from "./auth.utils";
import { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { TUser } from "../User/user.interface";
import { UserModel } from "../User/user.model";
import { sendMail } from "../../utils/sendMail";
import config from "../../config";

// --- Register New User (Manual Signup) ---
const registeredUserIntoDB = async (payload: TUser) => {
  const existing = await UserModel.isUserExistsByEmail(payload.email);
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, "This user already exists!");
  }

  // Set fullName if not provided
  if (!payload.fullName && payload.firstName && payload.lastName) {
    payload.fullName = `${payload.firstName} ${payload.lastName}`;
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const newUserData = {
    ...payload,
    verification: {
      code: otp,
      expireDate: new Date(Date.now() + 5 * 60 * 1000), // 5-minute expiry
    },
  };

  const user = await UserModel.create(newUserData);

  // Send OTP email
  await sendMail(
    payload.email,
    "Your Currently OTP Code",
    `Your OTP code is: ${otp}. It will expire in 5 minutes.`
  );

  return user;
};

// --- Verify OTP for Registration ---
export const verifyOTPForRegistration = async (email: string, otp: string) => {
  const user = await UserModel.findOne({ email }).select("+verification.code");
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "User is already verified!");
  }

  // Check OTP expiry
  if (!user.verification?.expireDate || user.verification.expireDate < new Date()) {
    throw new AppError(httpStatus.UNAUTHORIZED, "OTP has expired. Please resend.");
  }

  // Compare OTP using the model method
  const isMatch = user.compareVerificationCode(otp);
  if (!isMatch) {
    throw new AppError(httpStatus.UNAUTHORIZED, "OTP did not match!");
  }

  // Update user status
  user.isOtpVerified = true;
  user.verification = undefined; // Clear OTP data
  await user.save();

  // Generate JWT tokens
  const jwtPayload = {
    userId: user._id!.toString(),
    role: user?.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string
  );
  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string
  );

  return {
    accessToken,
    refreshToken,
    user
  };
};

// --- Resend OTP ---
const resendOTP = async (email: string) => {
  const user = await UserModel.findOne({ email });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found!");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await UserModel.findByIdAndUpdate(user._id, {
    verification: {
      code: otp,
      expireDate: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  await sendMail(
    email,
    "Your New OTP Code",
    `Your new OTP code is: ${otp}. It will expire in 5 minutes.`
  );

  return { message: "OTP sent successfully!" };
};

// --- Login User ---
const loginUser = async (payload: TLoginUser) => {
  const user = await UserModel.isUserExistsByEmail(payload.email);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "This user is not found!");
  }

  // Check if account is blocked
  if (user.status === 'blocked') {
    throw new AppError(httpStatus.FORBIDDEN, "Your account is blocked by admin!");
  }
if (!user.password) {
  throw new AppError(httpStatus.BAD_REQUEST, "This account doesn't have a password set. Please login with Google.");
}
  // Check password
  const isPasswordMatched = await UserModel.isPasswordMatched(payload.password, user.password);
  if (!isPasswordMatched) {
    throw new AppError(httpStatus.BAD_REQUEST, "Incorrect password!");
  }

  // Ensure OTP was verified during signup
  if (!user.isOtpVerified) {
    throw new AppError(httpStatus.FORBIDDEN, "Please verify your email via OTP first!");
  }

  // Update FCM Token for notifications
  await UserModel.findByIdAndUpdate(user._id, { fcmToken: payload.fcmToken });

  const jwtPayload = {
    userId: user._id!.toString(),
    role: user?.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string
  );
  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string
  );

  return { accessToken, refreshToken, user };
};

// --- Admin Login ---
const loginAdmin = async (payload: TLoginAdmin) => {
  const user = await UserModel.isUserExistsByEmail(payload.email);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "Admin not found!");

  if (user.role !== 'admin' && user.role !== 'superAdmin') {
    throw new AppError(httpStatus.UNAUTHORIZED, "You are not an admin!");
  }
 if (!user.password) {
    throw new AppError(httpStatus.BAD_REQUEST, "Admin password is not set!");
  }
  const isPasswordMatched = await UserModel.isPasswordMatched(payload.password, user.password);
  if (!isPasswordMatched) throw new AppError(httpStatus.BAD_REQUEST, "Incorrect password!");

  const jwtPayload = {
    userId: user._id!.toString(),
    role: user?.role,
  };

  return {
    accessToken: createToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expires_in as string),
    refreshToken: createToken(jwtPayload, config.jwt_refresh_secret as string, config.jwt_refresh_expires_in as string),
    user
  };
};

// --- Password Management (Change/Forgot/Reset) ---
const changePassword = async (me: JwtPayload, payload: { oldPassword: string; newPassword: string }) => {
  const user = await UserModel.isUserExistsById(me.userId);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  if (!user.password) {
    throw new AppError(httpStatus.BAD_REQUEST, "No password exists for this account!");
  }
  const isMatched = await UserModel.isPasswordMatched(payload.oldPassword, user.password);
  if (!isMatched) throw new AppError(httpStatus.FORBIDDEN, "Old password is incorrect!");

  const newHashedPassword = await bcrypt.hash(payload.newPassword, Number(config.bcrypt_salt_rounds));

  await UserModel.findByIdAndUpdate(user._id, {
    password: newHashedPassword,
    passwordChangedAt: new Date(),
  });

  return { message: "Password updated successfully" };
};

const forgotPass = async (email: string) => {
  const user = await UserModel.isUserExistsByEmail(email);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "No user found with this email");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  await UserModel.findByIdAndUpdate(user._id, {
    verification: {
      code: otp,
      expireDate: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  await sendMail(email, "Reset Password OTP", `Your OTP to reset password is: ${otp}`);
};

const verifyOTP = async (email: string, otp: string) => {
  const user = await UserModel.findOne({ email }).select("+verification.code");
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  const isMatch = user.compareVerificationCode(otp);
  if (!isMatch) throw new AppError(httpStatus.UNAUTHORIZED, "Invalid OTP");

  return { message: "OTP verified. You can now reset your password." };
};

const resetPassword = async (payload: { email: string; newPassword: string }) => {
  const user = await UserModel.isUserExistsByEmail(payload.email);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  const newHashedPassword = await bcrypt.hash(payload.newPassword, Number(config.bcrypt_salt_rounds));
  
  await UserModel.findByIdAndUpdate(user._id, {
    password: newHashedPassword,
    passwordChangedAt: new Date(),
    verification: undefined
  });

  return { message: "Password reset successful" };
};

const refreshToken = async (token: string) => {
  const decoded = verifyToken(token, config.jwt_refresh_secret as string);
  const user = await UserModel.isUserExistsById(decoded.userId);

  if (!user || user.status === 'blocked') {
    throw new AppError(httpStatus.FORBIDDEN, "Invalid refresh token!");
  }

  const jwtPayload = { userId: user._id!.toString(), role: user.role };
  return {
    accessToken: createToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expires_in as string)
  };
};

export const AuthServices = {
  registeredUserIntoDB,
  verifyOTPForRegistration,
  resendOTP,
  loginUser,
  loginAdmin,
  changePassword,
  forgotPass,
  verifyOTP,
  resetPassword,
  refreshToken,
};