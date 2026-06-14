import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { IntegrationServices } from './intigration.services';



const handleGoogleAuth = catchAsync(async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: "Authorization code is required from frontend",
    });
  }

  const result = await IntegrationServices.googleLoginAndSync(code);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Google Login and Classroom Sync successful!',
    data: result,
  });
});
const disconnectClassroom = catchAsync(async (req: Request, res: Response) => {
  await IntegrationServices.disconnectGoogleClassroomFromDB(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Google Classroom disconnected successfully!',
    data: null,
  });
});
const googleCallbackForApp = catchAsync(async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`currently://oauth/callback?error=no_code_found`);
  }

  res.redirect(`currently://oauth/callback?code=${code}`);
});





export const IntegrationControllers = {

  handleGoogleAuth,
  disconnectClassroom,
  googleCallbackForApp
};