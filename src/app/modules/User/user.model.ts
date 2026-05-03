import { model, Schema } from "mongoose";
import bcrypt from "bcrypt";
import { IUserMethods, TUser, User } from "./user.interface";
import { UserStatus } from "../Auth/auth.constant";
import config from "../../config";

const userSchema = new Schema<TUser, User, IUserMethods>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    fullName: { type: String },
    image: { type: String },
    email: { type: String, required: true, unique: true },
    schoolName: { type: String },
    dob: { type: Date },
    password: { type: String, select: false },
    googleId: { type: String, unique: true, sparse: true },
    accessToken: { type: String },
    verification: {
      code: { type: String, default: null },
      expireDate: { type: Date, default: null },
    },
    status: {
      type: String,
      required: true,
      enum: UserStatus,
      default: "active",
    },
    role: { 
      type: String, 
      required: true, 
      enum: ["student", "teacher", "parent", "admin", "superAdmin"], 
      default: "student" 
    },
    fcmToken: { type: String },
    isOtpVerified: { type: Boolean, default: false },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true }
);


userSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, Number(config.bcrypt_salt_rounds));
  }

  if (this.verification?.code && !this.verification.code.startsWith("$2b$")) {
    this.verification.code = bcrypt.hashSync(this.verification.code, Number(config.bcrypt_salt_rounds));
  }
  //  next() 
});
userSchema.methods.compareVerificationCode = function (userPlaneCode: string) {
  if (!this.verification?.code) return false;
  return bcrypt.compareSync(userPlaneCode, this.verification.code);
};

userSchema.statics.isUserExistsByEmail = async function (email: string) {
  return await UserModel.findOne({ email }).select("+password");
};

userSchema.statics.isUserExistsById = async function (id: string) {
  return await UserModel.findById(id).select("+password");
};

userSchema.statics.isPasswordMatched = async function (plainTextPassword, hashedPassword) {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

userSchema.statics.isJWTIssuedBeforePasswordChanged = function (passwordChangedTimestamp: Date, jwtIssuedTimestamp: number) {
  const passwordChangedTime = new Date(passwordChangedTimestamp).getTime() / 1000;
  return passwordChangedTime > jwtIssuedTimestamp;
};

export const UserModel = model<TUser, User>("User", userSchema);