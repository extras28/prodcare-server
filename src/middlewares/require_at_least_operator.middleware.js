import { ERROR_INSUFFICIENT_PERMISSIONS } from "../shared/errors/error";

export async function requireAtLeastOperator(req, res, next) {
  try {
    if (
      req.account.role === "ADMIN" ||
      req.account.role === "OPERATOR" ||
      req.isProjectPm
    ) {
      next();
    } else {
      throw new Error(ERROR_INSUFFICIENT_PERMISSIONS);
    }
  } catch (error) {
    next(error);
  }
}
