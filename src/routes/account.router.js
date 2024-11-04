import { Router } from "express";
import { authorizationMiddleware } from "../middlewares/authorization.middleware.js";
import * as accountController from "../controllers/account.controller.js";
export const accountRouter = Router();

accountRouter.get(
  "/account/detail",
  authorizationMiddleware,
  accountController.getAccountInformation
);
