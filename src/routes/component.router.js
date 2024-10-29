import { Router } from "express";
import { authorizationMiddleware } from "../middlewares/authorization.middleware.js";
import { requireAdminMiddleware } from "../middlewares/require_admin.middleware.js";
import * as componentController from "../controllers/component.controller.js";
import { checkingProjectPm } from "../middlewares/checking_project_pm.middleware.js";

export const componentRouter = Router();

componentRouter.post(
  "/component/create",
  authorizationMiddleware,
  checkingProjectPm,
  requireAdminMiddleware,
  componentController.createComponent
);

componentRouter.get(
  "/component/find",
  authorizationMiddleware,
  componentController.getListComponent
);

componentRouter.put(
  "/component/update",
  authorizationMiddleware,
  checkingProjectPm,
  requireAdminMiddleware,
  componentController.updateComponent
);

componentRouter.delete(
  "/component/delete",
  authorizationMiddleware,
  requireAdminMiddleware,
  componentController.deleteComponent
);

componentRouter.get(
  "/component/detail/:id",
  authorizationMiddleware,
  componentController.getComponentDetail
);
