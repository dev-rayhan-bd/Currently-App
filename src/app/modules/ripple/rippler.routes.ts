import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { RippleControllers } from './ripple.controller';
import { RippleValidations } from './ripple.validation';

const router = express.Router();

router.post(
  '/', 
  auth(USER_ROLE.student), 
  validateRequest(RippleValidations.createRippleZodSchema), 
  RippleControllers.createRipple
);

router.get('/my-ripples', auth(USER_ROLE.student, USER_ROLE.teacher), RippleControllers.getMyRipples);
router.get(
  '/all-view',
  auth(USER_ROLE.student),
  RippleControllers.getAllRipplesView
);
router.get(
  '/saved-for-later', 
  auth(USER_ROLE.student), 
  RippleControllers.getSavedForLater
);
router.get(
  '/session-manager/:id', 
  auth(USER_ROLE.student), 
  RippleControllers.getRippleSessionManager
);
router.get(
  '/analytics/progress', 
  auth(USER_ROLE.student), 
  RippleControllers.getProgressAnalytics
);
router.get('/:id', auth(USER_ROLE.student), RippleControllers.getSingleRipple);

router.patch(
  '/:id/status', 
  auth(USER_ROLE.student), 
  validateRequest(RippleValidations.updateRippleZodSchema), 
  RippleControllers.updateRipple
);

router.delete('/:id', auth(USER_ROLE.student), RippleControllers.deleteRipple);

export const RippleRoutes = router;