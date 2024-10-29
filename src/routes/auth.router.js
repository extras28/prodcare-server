import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authorizationMiddleware } from "../middlewares/authorization.middleware.js";

export const authRouter = Router();

authRouter.post("/auth/sign-up", authController.signUp);
authRouter.post("/auth/sign-in", authController.signIn);
authRouter.post(
  "/auth/sign-out",
  authorizationMiddleware,
  authController.signOut
);
authRouter.post(
  "/auth/change-password",
  authorizationMiddleware,
  authController.changePassword
);
