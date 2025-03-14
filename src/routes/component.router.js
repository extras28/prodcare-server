import { Router } from "express";
import * as componentController from "../controllers/component.controller.js";
import { authorizationMiddleware } from "../middlewares/authorization.middleware.js";
import { checkingProjectPm } from "../middlewares/checking_project_pm.middleware.js";
import { requireAtLeastOperator } from "../middlewares/require_at_least_operator.middleware.js";
import { uploadWithoutStoreFile } from "../middlewares/file_upload.middleware.js";

export const componentRouter = Router();

componentRouter.post(
    "/component/create",
    authorizationMiddleware,
    checkingProjectPm,
    requireAtLeastOperator,
    componentController.createComponent
);

componentRouter.get("/component/find", authorizationMiddleware, componentController.getListComponent);

componentRouter.put(
    "/component/update",
    authorizationMiddleware,
    checkingProjectPm,
    requireAtLeastOperator,
    componentController.updateComponent
);

componentRouter.delete(
    "/component/delete",
    authorizationMiddleware,
    requireAtLeastOperator,
    componentController.deleteComponent
);

componentRouter.get("/component/detail/:id", authorizationMiddleware, componentController.getComponentDetail);

// componentRouter.post("/component/upload", uploadWithoutStoreFile.single("file"), componentController.readFromExcel);

// componentRouter.post("/component/clone", componentController.cloneRecord);

componentRouter.get("/component/children/:id", componentController.getChildrenById);
