import express from "express";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { USER_ROLE } from "../Auth/auth.constant";
import { WaveControllers } from "./wave.controller";
import { WaveValidations } from "./wave.validation";

const router = express.Router();

router.post(
  "/create-wave",
  auth(USER_ROLE.student, USER_ROLE.teacher),
  validateRequest(WaveValidations.createWaveZodSchema),
  WaveControllers.createWave
);

router.get(
  "/my-waves",
  auth(USER_ROLE.student, USER_ROLE.teacher, USER_ROLE.parent),
  WaveControllers.getMyWaves
);

router.get(
  "/:id",
  auth(USER_ROLE.student, USER_ROLE.teacher),
  WaveControllers.getSingleWave
);

router.patch(
  "/:id",
  auth(USER_ROLE.student, USER_ROLE.teacher),
  validateRequest(WaveValidations.updateWaveZodSchema),
  WaveControllers.updateWave
);

export const WaveRoutes = router;