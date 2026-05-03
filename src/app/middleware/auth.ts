import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../config'; 
import { TUserRole } from '../modules/User/user.interface';
import catchAsync from '../utils/catchAsync';
import AppError from '../errors/AppError';
import { verifyToken } from '../modules/Auth/auth.utils';
import { UserModel } from '../modules/User/user.model';



const auth = (...requiredRoles: TUserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
// console.log("checking token -------------->",token); 
    // checking if the token is missingg

    if (!token) {
      // console.log("token null");
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
    }

    // checking if the given token is valid
    const decodedUser = verifyToken(token, config.jwt_access_secret as Secret);
    const { role, userId, iat } = decodedUser;
    // console.log("checking decoded User -------------->",role);
    
    // checking if the user is exist
    const user = await UserModel.isUserExistsById(userId);

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
    }

    if (requiredRoles && !requiredRoles.includes(role)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized !');
    }

    if (
      user.passwordChangedAt &&
      UserModel.isJWTIssuedBeforePasswordChanged(
        user.passwordChangedAt,
        iat as number,
      )
    ) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized !');
    }

    req.user = decodedUser as JwtPayload & { role: string };
    next();
  });
};

export default auth;
