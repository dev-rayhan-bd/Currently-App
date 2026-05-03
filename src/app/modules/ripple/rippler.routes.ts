import express from "express";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { USER_ROLE } from "../Auth/auth.constant";
import { RippleControllers } from "./ripple.controller";
import { RippleValidations } from "./ripple.validation";

const router = express.Router();

router.post(
  "/",
  auth(USER_ROLE.student),
  validateRequest(RippleValidations.createRippleZodSchema),
  RippleControllers.createRipple
);

router.patch(
  "/:id/status",
  auth(USER_ROLE.student),
  validateRequest(RippleValidations.updateRippleStatusZodSchema),
  RippleControllers.updateRippleStatus
);

router.get(
  "/my-ripples",
  auth(USER_ROLE.student, USER_ROLE.teacher),
  RippleControllers.getMyRipples
);

export const RippleRoutes = router;