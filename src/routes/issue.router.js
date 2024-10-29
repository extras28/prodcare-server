import { Router } from "express";
import * as issueController from "../controllers/issue.controller.js";
import { authorizationMiddleware } from "../middlewares/authorization.middleware.js";
import { requireAdminMiddleware } from "../middlewares/require_admin.middleware.js";
import { checkingProjectPm } from "../middlewares/checking_project_pm.middleware.js";
import { uploadWithoutStoreFile } from "../middlewares/file_upload.middleware.js";

export const issueRouter = Router();

issueRouter.post(
  "/issue/create",
  authorizationMiddleware,
  checkingProjectPm,
  requireAdminMiddleware,
  issueController.createIssue
);

issueRouter.get(
  "/issue/find",
  authorizationMiddleware,
  issueController.getListIssue
);

issueRouter.put(
  "/issue/update",
  authorizationMiddleware,
  checkingProjectPm,
  requireAdminMiddleware,
  issueController.updateIssue
);

issueRouter.delete(
  "/issue/delete",
  authorizationMiddleware,
  requireAdminMiddleware,
  issueController.deleteIssue
);

issueRouter.post(
  "/issue/upload",
  authorizationMiddleware,
  checkingProjectPm,
  requireAdminMiddleware,
  uploadWithoutStoreFile.single("file"),
  issueController.uploadExcelFile
);

issueRouter.get(
  "/issue/detail/:issueId",
  authorizationMiddleware,
  issueController.getIssueDetail
);
