import { Op } from "sequelize";
import { Component } from "../models/component.model.js";
import {
  ERROR_COMPONENT_EXISTED,
  ERROR_COMPONENT_NOT_EXISTED,
  ERROR_COMPONENT_PARENT_IS_REQUIRED,
  ERROR_INVALID_PARAMETERS,
  ERROR_PRODUCT_IS_REQUIRED,
} from "../shared/errors/error.js";
import { isValidNumber, removeEmptyFields } from "../shared/utils/utils.js";
import _ from "lodash";
import { Project } from "../models/project.model.js";
import { Product } from "../models/product.model.js";
import { Event } from "../models/event.model.js";
import { Issue } from "../models/issue.model.js";
import { Account } from "../models/account.model.js";

export async function createComponent(req, res, next) {
  try {
    const {
      parentId,
      productId,
      type,
      serial,
      description,
      category,
      level,
      name,
    } = req.body;

    const component = await Component.findOne({ where: { serial: serial } });

    if (!!component) throw new Error(ERROR_COMPONENT_EXISTED);

    if (Number(level) > 1 && !parentId)
      throw new Error(ERROR_COMPONENT_PARENT_IS_REQUIRED);

    if (Number(level) == 1 && !productId)
      throw new Error(ERROR_PRODUCT_IS_REQUIRED);

    const newComponent = await Component.create(
      removeEmptyFields({
        parent_id: parentId,
        product_id: productId,
        type,
        serial,
        description,
        category,
        level,
        name,
      })
    );

    res.send({ result: "success", component: newComponent });
  } catch (error) {
    next(error);
  }
}

export async function getListComponent(req, res, next) {
  try {
    let { q, page, limit, type, level, parentId, productId, projectId } =
      req.query;

    q = q ?? "";

    let productIds = [];

    // if (req.account.role === "USER") {
    // const userProjects = await Project.findAll({
    //   where: { project_pm: req.account.email }, // Assuming project_pm is the email of the account
    //   attributes: ["id"], // Fetch only the project IDs
    // });

    // const projectIds = userProjects.map((project) => project.id);

    const products = await Product.findAll({
      where: { project_id: projectId ?? "" },
      attributes: ["id"],
    });

    productIds = products.map((product) => product.id);
    // }

    const conditions = {
      [Op.or]: [
        {
          serial: { [Op.like]: `%${q}%` },
        },
        {
          category: { [Op.like]: `%${q}%` },
        },
        {
          name: { [Op.like]: `%${q}%` },
        },
      ],
      [Op.and]: [
        !!type ? { type } : undefined,
        !!productId ? { product_id: productId } : undefined,
        !!parentId ? { parent_id: parentId } : undefined,
        !!level ? { level } : undefined,
        { product_id: { [Op.in]: productIds } },
      ].filter(Boolean),
    };

    let components;

    if (!isValidNumber(limit) || !isValidNumber(page)) {
      page = undefined;
      limit = undefined;

      components = await Component.findAndCountAll({
        where: conditions,
        order: [["id", "DESC"]],
      });
    } else {
      limit = _.toNumber(limit);
      page = _.toNumber(page);

      components = await Component.findAndCountAll({
        where: conditions,
        limit,
        offset: limit * page,
        order: [["id", "DESC"]],
      });
    }

    res.send({
      result: "success",
      page,
      total: components.count,
      count: components.rows.length,
      components: components.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateComponent(req, res, next) {
  const {
    componentId,
    parentId,
    productId,
    type,
    serial,
    description,
    category,
    level,
    name,
  } = req.body;

  try {
    let component = await Component.findOne({
      where: { id: componentId },
    });

    if (!component?.toJSON()) {
      throw new Error(ERROR_COMPONENT_NOT_EXISTED);
    }

    if (Number(level) > 1 && !parentId)
      throw new Error(ERROR_COMPONENT_PARENT_IS_REQUIRED);

    await component.update(
      removeEmptyFields({
        parent_id: parentId,
        product_id: productId,
        type,
        serial,
        description,
        category,
        level,
        name,
      })
    );

    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}

export async function deleteComponent(req, res, next) {
  try {
    const { componentIds } = req.body;

    if (!_.isArray(componentIds)) throw new Error(ERROR_INVALID_PARAMETERS);

    let deleteCount = await Component.destroy({
      where: { id: { [Op.in]: componentIds } },
    });

    res.send({ result: "success", deleteCount });
  } catch (error) {
    next(error);
  }
}

export async function getComponentDetail(req, res, next) {
  try {
    const { id } = req.params;

    const [component, events, issues] = await Promise.all([
      Component.findOne({
        where: { id: id },
        include: [{ model: Product }],
      }),
      Event.findAndCountAll({
        where: { component_id: id },
        order: [["id", "ASC"]],
        include: {
          model: Account,
          attributes: ["email", "name", "avatar", "employee_id"],
        },
      }),
      Issue.findAndCountAll({
        where: { component_id: id },
        order: [["id", "DESC"]],
      }),
    ]);

    if (!component) throw new Error(ERROR_COMPONENT_NOT_EXISTED);

    res.send({ result: "success", component, events, issues });
  } catch (error) {
    next(error);
  }
}
