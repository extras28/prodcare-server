import { Account } from "../models/account.model.js";
import { ERROR_INSUFFICIENT_PERMISSIONS } from "../shared/errors/error.js";

export async function requireAdminMiddleware(req, res, next) {
  try {
    if (req.account.role == "ADMIN" || req.isProjectPm) {
      next();
    } else {
      throw new Error(ERROR_INSUFFICIENT_PERMISSIONS);
    }
  } catch (error) {
    next(error);
  }
}
