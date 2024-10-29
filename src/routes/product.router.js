import { Router } from "express";

export const productRouter = Router();
import * as productController from "../controllers/product.controller.js";
import * as productValidator from "./validators/product.validator.js";
import { authorizationMiddleware } from "../middlewares/authorization.middleware.js";
import { requireAdminMiddleware } from "../middlewares/require_admin.middleware.js";
import { checkingProjectPm } from "../middlewares/checking_project_pm.middleware.js";

productRouter.post(
  "/product/create",
  authorizationMiddleware,
  checkingProjectPm,
  requireAdminMiddleware,
  productValidator.createProductValidator,
  productController.createProduction
);

productRouter.get(
  "/product/find",
  authorizationMiddleware,
  productController.getListProduct
);

productRouter.put(
  "/product/update",
  authorizationMiddleware,
  checkingProjectPm,
  requireAdminMiddleware,
  productController.updateProduct
);

productRouter.delete(
  "/product/delete",
  authorizationMiddleware,
  requireAdminMiddleware,
  productController.deleteProduct
);

productRouter.get(
  "/product/detail/:id",
  authorizationMiddleware,
  productController.getProductDetail
);
