import { body } from "express-validator";
import { ERROR_MISSING_REQUIRED_PARAMETERS } from "../../shared/errors/error.js";

export const createProductValidator = [
  body("id").notEmpty().withMessage(ERROR_MISSING_REQUIRED_PARAMETERS),
  body("serial").notEmpty().withMessage(ERROR_MISSING_REQUIRED_PARAMETERS),
];
