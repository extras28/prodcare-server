import { Router } from "express";
import * as eventController from "../controllers/event.controller.js";
import { authorizationMiddleware } from "../middlewares/authorization.middleware.js";

export const eventRouter = Router();

eventRouter.post(
  "/event/create",
  authorizationMiddleware,
  eventController.createEvent
);

eventRouter.put(
  "/event/update",
  authorizationMiddleware,
  eventController.updateEvent
);

eventRouter.get(
  "/event/find",
  authorizationMiddleware,
  eventController.getListEvent
);

eventRouter.delete(
  "/event/delete",
  authorizationMiddleware,
  eventController.deleteEvent
);
