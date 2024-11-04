import { Router } from "express";
import * as dashboardController from "../controllers/dasboard.controller.js";
import { authorizationMiddleware } from "../middlewares/authorization.middleware.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/dashboard/year",
  authorizationMiddleware,
  dashboardController.getStatisticThroughYear
);

dashboardRouter.get(
  "/dashboard/quarter",
  authorizationMiddleware,
  dashboardController.getStatisticThroughQuarter
);

dashboardRouter.get(
  "/dashboard/month",
  authorizationMiddleware,
  dashboardController.getStatisticThroughMonth
);

dashboardRouter.post("/dashboard/update", dashboardController.updateMultiIssue);
