import { Router } from "express";
import * as productController from "../controllers/product.controller.js";
import { authorizationMiddleware } from "../middlewares/authorization.middleware.js";
import { checkingProjectPm } from "../middlewares/checking_project_pm.middleware.js";
import { requireAtLeastOperator } from "../middlewares/require_at_least_operator.middleware.js";
import * as productValidator from "./validators/product.validator.js";

export const productRouter = Router();

productRouter.post(
    "/product/create",
    authorizationMiddleware,
    checkingProjectPm,
    requireAtLeastOperator,
    productValidator.createProductValidator,
    productController.createProduction
);

productRouter.get("/product/find", authorizationMiddleware, productController.getListProduct);

productRouter.put(
    "/product/update",
    authorizationMiddleware,
    checkingProjectPm,
    requireAtLeastOperator,
    productController.updateProduct
);

productRouter.delete(
    "/product/delete",
    authorizationMiddleware,
    requireAtLeastOperator,
    productController.deleteProduct
);

productRouter.get("/product/detail/:id", authorizationMiddleware, productController.getProductDetail);

productRouter.get("/product/list", authorizationMiddleware, productController.getListProductInTree);

productRouter.get("/product/excel", authorizationMiddleware, productController.exportFileAll);

productRouter.post("/product/serial", productController.updateSerialForDescendants);
