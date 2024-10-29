import { Op } from "sequelize";
import { Project } from "../models/project.model.js";
import {
  ERROR_INVALID_PARAMETERS,
  ERROR_PROJECT_EXISTED,
  ERROR_PROJECT_NOT_EXISTED,
} from "../shared/errors/error.js";
import { isValidNumber, removeEmptyFields } from "../shared/utils/utils.js";
import _ from "lodash";
import { Account } from "../models/account.model.js";
import { Customer } from "../models/customer.model.js";

export async function createProject(req, res, next) {
  try {
    const { projectId, projectPm, projectName, note } = req.body;

    const project = await Project.findOne({ where: { id: projectId } });

    if (!!project) throw new Error(ERROR_PROJECT_EXISTED);

    await Project.create(
      removeEmptyFields({
        id: projectId,
        project_pm: projectPm,
        note,
        project_name: projectName,
      })
    );

    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}

export async function getListProject(req, res, next) {
  try {
    const projectPm = req.email;
    const account = await Account.findOne({ where: { email: req.email } });
    let { q, page, limit } = req.query;

    q = q ?? "";

    const conditions = {
      [Op.or]: [
        {
          id: { [Op.like]: `%${q}%` },
        },
        {
          project_pm: { [Op.like]: `%${q}%` },
        },
        {
          project_name: { [Op.like]: `%${q}%` },
        },
      ],

      [Op.and]: [
        account.role === "USER" ? { project_pm: projectPm } : undefined,
      ],
    };

    let projects;

    if (!isValidNumber(limit) || !isValidNumber(page)) {
      page = undefined;
      limit = undefined;

      projects = await Project.findAndCountAll({
        where: conditions,
        order: [["id", "DESC"]],
      });
    } else {
      limit = _.toNumber(limit);
      page = _.toNumber(page);

      projects = await Project.findAndCountAll({
        where: conditions,
        limit,
        offset: limit * page,
        order: [["id", "DESC"]],
      });
    }

    res.send({
      result: "success",
      page,
      total: projects.count,
      count: projects.rows.length,
      projects: projects.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProject(req, res, next) {
  const { projectId, projectPm, projectName, note } = req.body;

  try {
    let project = await Project.findOne({
      where: { id: projectId },
    });

    if (!project?.toJSON()) {
      throw new Error(ERROR_PROJECT_NOT_EXISTED);
    }

    await project.update(
      removeEmptyFields({
        id: projectId,
        project_pm: projectPm,
        note,
        project_name: projectName,
      })
    );

    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}

export async function deleteProject(req, res, next) {
  try {
    const { projectIds } = req.body;

    if (!_.isArray(projectIds)) throw new Error(ERROR_INVALID_PARAMETERS);

    let deleteCount = await Project.destroy({
      where: { id: { [Op.in]: projectIds } },
    });

    res.send({ result: "success", deleteCount });
  } catch (error) {
    next(error);
  }
}
