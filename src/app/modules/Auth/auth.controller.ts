
import httpStatus from 'http-status';

import { NextFunction, Request, Response } from 'express';


import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';
import { AuthServices } from './auth.services';
import config from '../../config';
import uploadImage from '../../middleware/upload';

const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    
    const userPayload = req.body;
// console.log("userpayload--->",userPayload);
   if (req.file) {
      const imageUrl = await uploadImage(req);
      userPayload.image = imageUrl;
    }
// console.log("ueser payload--->",userPayload);
    const result = await AuthServices.registeredUserIntoDB(userPayload);

    sendResponse(res, {
      success: true,
      message: 'Otp is send your email succesfully!Please verify your otp',
      statusCode: httpStatus.CREATED,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const VerifyOtpForRegistration=catchAsync(async (req:Request, res:Response) => {
    const { email,otp}= req.body;
  // console.log("request body",req.body);
    const result = await AuthServices.verifyOTPForRegistration(email,otp);
    //set refress token on cookies
  res.cookie('refreshToken', result.refreshToken, {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24 * 365,
  });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Otp Verify succesfully!',
      data: result,
    });
  });
const resendOtp = catchAsync(async (req, res) => {
    const {email} = req.body;
  // console.log("request body",req.body);
    const result = await AuthServices.resendOTP(email);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Otp is send again your email succesfully!',
      data: result,
    });
  });

const userLogin=catchAsync(async(req,res)=>{
  const result = await AuthServices.loginUser(req.body);

//set refress token on cookies
  res.cookie('refreshToken', result.refreshToken, {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24 * 365,
  });
    sendResponse(res, {
        success: true,
        message: 'User Logged in Successfully',
        statusCode: httpStatus.OK,
        data: result,
      });
})
const AdminLogin=catchAsync(async(req,res)=>{
  const result = await AuthServices.loginAdmin(req.body);

//set refress token on cookies
  res.cookie('refreshToken', result.refreshToken, {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24 * 365,
  });
    sendResponse(res, {
        success: true,
        message: 'User Logged in Successfully',
        statusCode: httpStatus.OK,
        data: result,
      });
})

const changePassword = catchAsync(async (req, res) => {
    const { ...passwordData } = req.body;
//   console.log("request body",req.body);

const me = req.user
    const result = await AuthServices.changePassword(me, passwordData);
    //set refress token on cookies
  res.cookie('refreshToken', result.refreshToken, {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24 * 365,
  });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Password is updated succesfully!',
      data: result,
    });
  });
const resetPassword = catchAsync(async (req, res) => {
    const { ...passwordData } = req.body;
  // console.log("request body",req.body);
    const result = await AuthServices.resetPassword(passwordData);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Password is updated succesfully!',
      data: result,
    });
  });


const forgotPassword = catchAsync(async (req:Request, res:Response) => {
    const { email}= req.body;
  // console.log("request body",email);
    const result = await AuthServices.forgotPass(email);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Otp send succesfully!',
      data: result,
    });
  });
const verifyYourOTP = catchAsync(async (req:Request, res:Response) => {
    const { email,otp}= req.body;
  // console.log("request body",req.body);
    const result = await AuthServices.verifyOTP(email,otp);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Otp Verify succesfully!',
      data: result,
    });
  });
  const refreshToken = catchAsync(async (req, res) => {
    // const { refreshToken } = req.cookies;
    const { refreshToken } = req.body;
    // console.log('refreshToken',refreshToken);
  
    const result = await AuthServices.refreshToken(refreshToken);
    console.log('refreshToken',result);
  
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Access token is retrieved succesfully!',
      data: result,
    });
  });

export const AuthControllers = {
  registerUser,userLogin,changePassword,refreshToken,forgotPassword,verifyYourOTP,resetPassword,VerifyOtpForRegistration,resendOtp,AdminLogin
};
