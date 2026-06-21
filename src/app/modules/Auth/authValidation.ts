import { z } from "zod";

// --- Reusable Schemas ---

const emailSchema = z
  .string("Email is required")
  .trim()
  .email({ message: "Invalid email address" })
  .toLowerCase();

const passwordSchema = z
  .string( "Password is required" )
  .min(8, { message: "Password must be at least 8 characters" })
  .max(128, { message: "Password must be at most 128 characters" })
  .refine((v) => v.trim() === v, {
    message: "Password cannot start or end with spaces",
  })
  .refine((v) => /[a-z]/.test(v), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((v) => /[A-Z]/.test(v), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((v) => /[^A-Za-z0-9]/.test(v), {
    message: "Password must contain at least one special character",
  });

const dobSchema = z
  .union([
    z.date(),
    z.string().trim().min(1, { message: "Date of birth is required" }),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)))
  .refine((d) => !Number.isNaN(d.getTime()), { message: "Invalid date of birth" });

// --- Validation Schemas ---

const registerUserValidationSchema = z.object({
  firstName: z
    .string("First name is required" )
    .trim()
    .min(1, { message: "First name cannot be empty" })
    .max(50, { message: "First name cannot exceed 50 characters" }),

  lastName: z
    .string("Last name is required")
    .trim()
    .min(1, { message: "Last name cannot be empty" })
    .max(50, { message: "Last name cannot exceed 50 characters" }),

  email: emailSchema,
  password: passwordSchema,
  
  dob: dobSchema.optional(), 
  schoolName: z.string().trim().max(100).optional(),
  fcmToken: z.string().trim().optional(),
});

const loginValidationSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required" }),
  fcmToken: z.string().trim().optional(),
});

const AdminloginValidationSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required" }),
});

const editProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  dob: dobSchema.optional(),
  schoolName: z.string().trim().max(100).optional(),
  image: z.string().optional(),
});

/**
 * Forgot/Verify OTP
 */
const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: z
    .string( "OTP is required")
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain only digits"),
});

/**
 * Password management
 */
const changePasswordValidationSchema = z.object({
  oldPassword: z.string().min(1, { message: "Old password is required" }),
  newPassword: passwordSchema,
});

const resetPasswordValidationSchema = z.object({
  email: emailSchema,
  newPassword: passwordSchema,
});

/**
 * Refresh token
 */
const refreshTokenValidationSchema = z.object({
  refreshToken: z.string("Refresh Token is required!" ).min(1),
});

// --- Final Export ---

export const AuthValidation = {
  registerUserValidationSchema,
  loginValidationSchema,
  AdminloginValidationSchema,
  editProfileSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  changePasswordValidationSchema,
  resetPasswordValidationSchema,
  refreshTokenValidationSchema,
};