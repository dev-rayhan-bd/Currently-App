import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { TeacherControllers } from './teacher.controller';

const router = express.Router();

router.get('/dashboard-summary', auth(USER_ROLE.teacher), TeacherControllers.getDashboardSummary);
router.get('/my-classes', auth(USER_ROLE.teacher), TeacherControllers.getMyClasses);
router.get(
  '/class-detail/:classId', 
  auth(USER_ROLE.teacher), 
  TeacherControllers.getClassDetail
);

router.get('/attention-list', auth(USER_ROLE.teacher), TeacherControllers.getStudentsNeedingAttention);


router.post('/send-reminder', auth(USER_ROLE.teacher), TeacherControllers.sendReminders);
router.get(
  '/assignments/overview', 
  auth(USER_ROLE.teacher), 
  TeacherControllers.getAssignmentsOverview
);
router.get('/export-report/:classroomId', auth(USER_ROLE.teacher), TeacherControllers.exportReport);
router.post('/send-class-reminder', auth(USER_ROLE.teacher), TeacherControllers.sendClassReminder);
router.get(
  '/profile-stats', 
  auth(USER_ROLE.teacher), 
  TeacherControllers.getTeacherProfileStats
);
export const TeacherRoutes = router;