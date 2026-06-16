import { Types } from 'mongoose';
import { UserModel } from '../modules/User/user.model';


export const generateReferCode = async (): Promise<string> => {
  const lastUser = await UserModel.findOne().sort({ createdAt: -1 });

  let count: number;

  if (lastUser && Types.ObjectId.isValid(lastUser._id)) {
    const objectId = new Types.ObjectId(lastUser._id);
    count = objectId.getTimestamp().getTime();
  } else {
    count = Date.now();
  }

  return `REF${count.toString().slice(-6)}`;
};
