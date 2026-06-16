import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { FeedbackControllers } from './feedback.controller';


const router = express.Router();

router.post('/create', auth(USER_ROLE.student), FeedbackControllers.createFeedback);


router.get('/', auth(USER_ROLE.admin, USER_ROLE.superAdmin), FeedbackControllers.getAllFeedbacks);
router.patch(
  '/update-status/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),

  FeedbackControllers.updateFeedbackStatus
);
export const FeedbackRoutes = router;