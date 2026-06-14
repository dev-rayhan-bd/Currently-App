import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { DashboardControllers } from './dashboard.controller';

const router = express.Router();

router.get(
  '/summary',
  auth(USER_ROLE.student),
  DashboardControllers.getDashboardSummary
);

export const DashboardRoutes = router;