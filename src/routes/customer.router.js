import { Router } from "express";

export const customerRouter = Router();
import * as customerController from "../controllers/customer.controller.js";
import { authorizationMiddleware } from "../middlewares/authorization.middleware.js";
import { requireAdminMiddleware } from "../middlewares/require_admin.middleware.js";
import * as customerValidator from "./validators/customer.validator.js";

customerRouter.post(
  "/customer/create",
  authorizationMiddleware,
  requireAdminMiddleware,
  customerValidator.createCustomerValidator,
  customerController.createCustomer
);

customerRouter.get(
  "/customer/find",
  authorizationMiddleware,
  customerController.getListCustomer
);

customerRouter.put(
  "/customer/update",
  authorizationMiddleware,
  requireAdminMiddleware,
  customerController.updateCustomer
);

customerRouter.delete(
  "/customer/delete",
  authorizationMiddleware,
  requireAdminMiddleware,
  customerController.deleteCustomer
);

customerRouter.get(
  "/customer/detail/:id",
  authorizationMiddleware,
  customerController.getCustomerDetail
);
