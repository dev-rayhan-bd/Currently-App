import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import { TLoginAdmin, TLoginUser } from "./auth.interface";
import { createToken, verifyToken } from "./auth.utils";
import { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { TUser } from "../User/user.interface";
import { UserModel } from "../User/user.model";

import config from "../../config";
import { getEmailTemplate } from "../../utils/emailTemplate";
import sendEmail from "../../utils/sendEmail";
import { sendNotification, sendNotificationToAdmins } from "../../utils/sendNotification";

// --- Register New User (Manual Signup) ---
const registeredUserIntoDB = async (payload: TUser) => {
  const existing = await UserModel.isUserExistsByEmail(payload.email);
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, "This user already exists!");
  }
 let initialStatus: 'active' | 'pending' = 'active'; 

if (payload.role === 'teacher'|| payload.role ==='student') {
  initialStatus = 'pending';
}
  // Set fullName if not provided
  if (!payload.fullName && payload.firstName && payload.lastName) {
    payload.fullName = `${payload.firstName} ${payload.lastName}`;
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const newUserData = {
    ...payload,
    status: initialStatus,
    verification: {
      code: otp,
      expireDate: new Date(Date.now() + 5 * 60 * 1000), // 5-minute expiry
    },
  };

  const user = await UserModel.create(newUserData);

await sendNotificationToAdmins(
  "New Registration Request 🎓",
  `${user.fullName} has registered as a ${user.role} and needs approval.`,
  "approval"
);
  // Send OTP email
 const html = getEmailTemplate({
  userName: payload.firstName,
  title: "Verify Your Account",
  body: "Welcome to Currently! Use the code below to verify your email and start making ripples.",
  otpCode: otp
});
await sendEmail({
  to: payload.email,
  subject: "Verify your Currently Account",
  html: html
});
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
const html = getEmailTemplate({
  userName: user.firstName,
  title: "Welcome to Currently!",
  body: "We are excited to have you here. Your account is now fully verified. Start your first session and make some ripples today!"
});

await sendEmail({
  to: user.email,
  subject: "Welcome to Currently!",
  html: html
});
  return {
    accessToken,
    refreshToken,
    user
  };
};

// --- Forgot Password Service ---
export const forgotPass = async (email: string) => {

  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "No user found with this email");
  }


  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  

  user.verification = {
    code: otp,
    expireDate: new Date(Date.now() + 5 * 60 * 1000), 
  };


  await user.save();


  const html = getEmailTemplate({
    userName: user.firstName,
    title: "Reset Your Password",
    body: "We received a request to reset your password. Use the OTP below to proceed with resetting your password.",
    otpCode: otp 
  });

  await sendEmail({
    to: email,
    subject: "Password Reset OTP",
    html: html
  });

  return { message: "OTP sent to your email" };
};


// --- Resend OTP Service ---
const resendOTP = async (email: string) => {

  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  if (user.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "User is already verified!");
  }


  const otp = Math.floor(100000 + Math.random() * 900000).toString();


  user.verification = {
    code: otp,
    expireDate: new Date(Date.now() + 5 * 60 * 1000),
  };

  await user.save();


  const html = getEmailTemplate({
    userName: user.firstName,
    title: "New OTP Requested",
    body: "You requested a new verification code. Please use the code below to verify your account.",
    otpCode: otp
  });

  await sendEmail({
    to: email,
    subject: "Your New OTP Code",
    html: html
  });

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
if (user.status === 'pending') {
  throw new AppError(
    httpStatus.FORBIDDEN, 
    "Your account is awaiting admin approval. You will be notified once active."
  );
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
  await UserModel.findByIdAndUpdate(user._id, { lastActiveAt: new Date() });
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
const changePassword = async (
  me: JwtPayload,
  payload: { oldPassword: string; newPassword: string }
) => {
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


  const jwtPayload = { userId: user._id!.toString(), role: user.role };
  
  const accessToken = createToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expires_in as string);
  const refreshToken = createToken(jwtPayload, config.jwt_refresh_secret as string, config.jwt_refresh_expires_in as string);
await sendNotification(user._id!.toString(), "Security Alert 🔒", "Your account password was recently changed.", "system");
  return {
    accessToken,
    refreshToken,
    message: "Password updated successfully"
  };
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

const html = getEmailTemplate({
  userName: user.firstName,
  title: "Password Reset Successful",
  body: "Your password has been successfully updated. If you didn't perform this action, please contact support immediately.",
  buttonText: "Login Now",
  buttonLink: "https://currently.app/login"
});

await sendEmail({
  to: user.email,
  subject: "Password Security Alert",
  html: html
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
const logoutUserFromDB = async (userId: string) => {
  
  const result = await UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        fcmToken: null, 
        googleRefreshToken: null 
      }
    },
    { new: true }
  );

  return result;
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
  logoutUserFromDB
};