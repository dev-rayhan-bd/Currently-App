import config from "../config";
import { USER_ROLE } from "../modules/Auth/auth.constant";
import { TUser } from "../modules/User/user.interface";
import { UserModel } from "../modules/User/user.model";

const seedAdmin = async () => {

  const superUser: Partial<TUser> = {
    firstName: config.super_admin_first_name as string,
    lastName: config.super_admin_last_name as string,
    fullName: `${config.super_admin_first_name} ${config.super_admin_last_name}`,
    email: config.super_admin_email as string,
    password: config.super_admin_password as string,
    role: USER_ROLE.superAdmin,
    status: 'active', 
    isOtpVerified: true,
  };

  try {

    const isSuperAdminExits = await UserModel.findOne({ role: USER_ROLE.superAdmin });

    if (!isSuperAdminExits) {
      await UserModel.create(superUser);
      console.log("✅ Super Admin seeded successfully!");
    } else {
      console.log("ℹ️ Super Admin already exists. Skipping seed.");
    }
  } catch (error) {
    console.error("❌ Error seeding Admin:", error);
  }
};

export default seedAdmin;