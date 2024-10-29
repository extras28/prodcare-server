import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { authorizationMiddleware } from "../middlewares/authorization.middleware.js";
import { requireAdminMiddleware } from "../middlewares/require_admin.middleware.js";
import { uploadPublicImage } from "../middlewares/file_upload.middleware.js";

export const userRouter = Router();

userRouter.post(
  "/user/create",
  authorizationMiddleware,
  requireAdminMiddleware,
  uploadPublicImage.single("avatar"),
  userController.createNewUser
);

userRouter.get(
  "/user/find",
  authorizationMiddleware,
  userController.getListUser
);

userRouter.put(
  "/user/update",
  authorizationMiddleware,
  requireAdminMiddleware,
  uploadPublicImage.single("avatar"),
  userController.updateUser
);

userRouter.delete(
  "/user/delete",
  authorizationMiddleware,
  requireAdminMiddleware,
  userController.deleteUser
);
