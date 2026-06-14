import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TeacherServices } from './teacher.services';


const getDashboardSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await TeacherServices.getDashboardSummaryFromDB(req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Summary retrieved successfully',
    data: result,
  });
});

const getMyClasses = catchAsync(async (req: Request, res: Response) => {

  const result = await TeacherServices.getMyClassesFromDB(req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Classes retrieved successfully',
    data: result,
  });
});
const getClassDetail = catchAsync(async (req: Request, res: Response) => {
  const result = await TeacherServices.getClassDetailFromDB(req.params.classId as string);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Class detail matrix retrieved successfully',
    data: result,
  });
});
const sendReminders = catchAsync(async (req: Request, res: Response) => {
  const { studentIds } = req.body;
  const result = await TeacherServices.sendRemindersToStudentsFromDB(req.user.userId as string, studentIds);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reminders sent successfully',
    data: result,
  });
});
const getStudentsNeedingAttention = catchAsync(async (req: Request, res: Response) => {
  const result = await TeacherServices.getStudentsNeedingAttentionFromDB(
    req.user.userId, 
    req.query.classId as string
  );
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Students needing attention retrieved',
    data: result,
  });
});
const getAssignmentsOverview = catchAsync(async (req: Request, res: Response) => {
  const result = await TeacherServices.getAssignmentsOverviewFromDB(req.user.userId);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Assignment overview retrieved successfully',
    data: result,
  });
});

const exportReport = catchAsync(async (req: Request, res: Response) => {
  const { classroomId } = req.params;
  const workbook = await TeacherServices.getExportReportDataFromDB(classroomId as string);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Class_Report_${classroomId}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
});

const sendClassReminder = catchAsync(async (req: Request, res: Response) => {
  const { classroomId } = req.body;
  const result = await TeacherServices.sendClassReminderFromDB(req.user.userId, classroomId);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Class reminders sent successfully',
    data: result,
  });
});
const getTeacherProfileStats = catchAsync(async (req: Request, res: Response) => {
  const result = await TeacherServices.getTeacherProfileStatsFromDB(req.user.userId);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Teacher profile stats retrieved successfully',
    data: result,
  });
});

export const TeacherControllers = {
  getDashboardSummary,
  getMyClasses,
  getClassDetail,
  sendReminders,
  getAssignmentsOverview,
  getStudentsNeedingAttention,
  exportReport,
  sendClassReminder,
  getTeacherProfileStats
};