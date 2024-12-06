import { Router } from "express";
import { authorizationMiddleware } from "../middlewares/authorization.middleware.js";
import * as accountController from "../controllers/account.controller.js";
export const accountRouter = Router();

accountRouter.get(
  "/account/detail",
  authorizationMiddleware,
  accountController.getAccountInformation
);

accountRouter.post(
  "/account/issue-column",
  authorizationMiddleware,
  accountController.adjustIssueColumns
);

accountRouter.get(
  "/account/get-issue-column",
  authorizationMiddleware,
  accountController.getIssueColumns
);
