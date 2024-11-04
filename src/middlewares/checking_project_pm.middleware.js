import { Product } from "../models/product.model.js";
import { Project } from "../models/project.model.js";

export async function checkingProjectPm(req, res, next) {
  try {
    const { projectId, productId, componentId } = req.body;
    let project = {};

    if (!!projectId) {
      project = await Project.findOne({ where: { project_pm: req.email } });
    } else if (!!productId) {
      const product = await Product.findOne({ where: { id: productId } });
      project = await Project.findOne({ where: { id: product["project_id"] } });
    }

    if (req.account.role === "ADMIN" || req.account.role === "OPERATOR") {
      next();
    } else if (
      req.account.role === "USER" &&
      project["project_pm"] == req.email
    ) {
      req.isProjectPm = true;
      next();
    } else {
      throw new Error(ERROR_INSUFFICIENT_PERMISSIONS);
    }
  } catch (error) {
    next(error);
  }
}
