import { Router } from "express";
import * as issueController from "../controllers/issue.controller.js";
import { authorizationMiddleware } from "../middlewares/authorization.middleware.js";
import { checkingProjectPm } from "../middlewares/checking_project_pm.middleware.js";
import { uploadWithoutStoreFile } from "../middlewares/file_upload.middleware.js";
import { requireAtLeastOperator } from "../middlewares/require_at_least_operator.middleware.js";

export const issueRouter = Router();

issueRouter.post(
    "/issue/create",
    authorizationMiddleware,
    checkingProjectPm,
    requireAtLeastOperator,
    issueController.createIssue
);

issueRouter.get("/issue/find", authorizationMiddleware, issueController.getListIssue);

issueRouter.put(
    "/issue/update",
    authorizationMiddleware,
    checkingProjectPm,
    requireAtLeastOperator,
    issueController.updateIssue
);

issueRouter.delete("/issue/delete", authorizationMiddleware, requireAtLeastOperator, issueController.deleteIssue);

// issueRouter.post(
//     "/issue/upload",
//     // authorizationMiddleware,
//     // checkingProjectPm,
//     // requireAtLeastOperator,
//     uploadWithoutStoreFile.single("file"),
//     issueController.uploadExcelFile
// );

issueRouter.get("/issue/detail/:issueId", authorizationMiddleware, issueController.getIssueDetail);

issueRouter.get("/issue/reason", authorizationMiddleware, issueController.getListOfReason);

// issueRouter.post("/issue/swap", issueController.swapHandlingMeasureAndHandlingPlan);

issueRouter.put("/issue/situation", issueController.createSituation);

// issueRouter.post("/issue/file", uploadWithoutStoreFile.single("file"), issueController.readIssueFromFile);
