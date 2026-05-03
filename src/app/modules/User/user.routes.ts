import express from 'express';
import { UserControllers } from './user.controller';
import { USER_ROLE } from '../Auth/auth.constant';
import { upload } from '../../middleware/multer';
import auth from '../../middleware/auth';

const router = express.Router();

router.get('/my-profile', auth(USER_ROLE.student, USER_ROLE.teacher, USER_ROLE.parent, USER_ROLE.admin), UserControllers.getMyProfile);

router.patch(
  '/edit-profile',
  auth(USER_ROLE.student, USER_ROLE.teacher, USER_ROLE.parent),
  upload.single('image'),
  (req, res, next) => {
    if (req.body.body) req.body = JSON.parse(req.body.body);
    next();
  },
  UserControllers.updateProfile
);

router.get('/all-users', auth(USER_ROLE.admin, USER_ROLE.superAdmin), UserControllers.getAllUsers);

router.patch('/block-user/:id', auth(USER_ROLE.admin, USER_ROLE.superAdmin), UserControllers.toggleBlockStatus);

export const UserRoutes = router;