import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { IntegrationControllers } from './intigration.controller';


const router = express.Router();


router.post('/google-auth', IntegrationControllers.handleGoogleAuth);
router.post(
  '/disconnect-classroom',
  auth(USER_ROLE.student),
  IntegrationControllers.disconnectClassroom
);
router.get('/google/callback', IntegrationControllers.googleCallbackForApp);
export const IntegrationRoutes = router;