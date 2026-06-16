import express from 'express';
import { UserControllers } from './user.controller';
import { USER_ROLE } from '../Auth/auth.constant';
import { upload } from '../../middleware/multer';
import auth from '../../middleware/auth';

const router = express.Router();

router.get('/my-profile', auth(USER_ROLE.student, USER_ROLE.teacher, USER_ROLE.parent, USER_ROLE.admin,USER_ROLE.superAdmin), UserControllers.getMyProfile);

router.patch(
  '/edit-profile',
  auth(USER_ROLE.student, USER_ROLE.teacher, USER_ROLE.parent,USER_ROLE.superAdmin),
  upload.single('image'),
  (req, res, next) => {
    if (req.body.body) req.body = JSON.parse(req.body.body);
    next();
  },
  UserControllers.updateProfile
);
router.delete(
  '/delete-account',
  auth(USER_ROLE.student, USER_ROLE.teacher, USER_ROLE.parent),
  UserControllers.deleteMyAccount
);
router.get('/all-users', auth(USER_ROLE.admin, USER_ROLE.superAdmin), UserControllers.getAllUsers);

router.patch('/block-user/:id', auth(USER_ROLE.admin, USER_ROLE.superAdmin), UserControllers.toggleBlockStatus);

router.post(
  '/generate-link-code',
  auth(USER_ROLE.student),
  UserControllers.generateLinkCode
);

router.post(
  '/link-child',
  auth(USER_ROLE.parent),
  UserControllers.linkChildByCode
);
router.get(
  '/my-children',
  auth(USER_ROLE.parent),
  UserControllers.getMyChildren
);
router.get(
  '/child-dashboard/:childId', 
  auth(USER_ROLE.parent), 
  UserControllers.getChildDashboard
);
router.get(
  '/child-report/:childId', 
  auth(USER_ROLE.parent), 
  UserControllers.getChildProgressReport
);
router.get(
  '/my-children', 
  auth(USER_ROLE.parent), 
  UserControllers.getMyChildrenList
);
router.patch(
  '/remove-child/:childId', 
  auth(USER_ROLE.parent), 
  UserControllers.removeChild
);

export const UserRoutes = router;