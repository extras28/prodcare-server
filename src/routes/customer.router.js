import { Router } from "express";
import * as customerController from "../controllers/customer.controller.js";
import { authorizationMiddleware } from "../middlewares/authorization.middleware.js";
import { requireAtLeastOperator } from "../middlewares/require_at_least_operator.middleware.js";
import * as customerValidator from "./validators/customer.validator.js";

export const customerRouter = Router();

customerRouter.post(
  "/customer/create",
  authorizationMiddleware,
  requireAtLeastOperator,
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
  requireAtLeastOperator,
  customerController.updateCustomer
);

customerRouter.delete(
  "/customer/delete",
  authorizationMiddleware,
  requireAtLeastOperator,
  customerController.deleteCustomer
);

customerRouter.get(
  "/customer/detail/:id",
  authorizationMiddleware,
  customerController.getCustomerDetail
);
