import { Router } from "express";
import * as projectController from "../controllers/project.controller.js";
import { authorizationMiddleware } from "../middlewares/authorization.middleware.js";
import { requireAdminMiddleware } from "../middlewares/require_admin.middleware.js";
import * as projectValidator from "./validators/project.validator.js";

export const projectRouter = Router();

projectRouter.post(
  "/project/create",
  authorizationMiddleware,
  requireAdminMiddleware,
  projectValidator.createProjectValidator,
  projectController.createProject
);

projectRouter.get(
  "/project/find",
  authorizationMiddleware,
  projectController.getListProject
);

projectRouter.put(
  "/project/update",
  authorizationMiddleware,
  requireAdminMiddleware,
  projectController.updateProject
);

projectRouter.delete(
  "/project/delete",
  authorizationMiddleware,
  requireAdminMiddleware,
  projectController.deleteProject
);
