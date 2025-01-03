import _ from "lodash";
import { Op } from "sequelize";
import { Account } from "../models/account.model.js";
import { Component } from "../models/component.model.js";
import { Event } from "../models/event.model.js";
import { Issue } from "../models/issue.model.js";
import { Product } from "../models/product.model.js";
import {
  ERROR_COMPONENT_EXISTED,
  ERROR_COMPONENT_NOT_EXISTED,
  ERROR_COMPONENT_PARENT_IS_REQUIRED,
  ERROR_INVALID_COMPONENT_LEVEL,
  ERROR_INVALID_PARAMETERS,
  ERROR_MAX_COMPONENT_LEVEL,
  ERROR_PRODUCT_IS_REQUIRED,
} from "../shared/errors/error.js";
import {
  isValidNumber,
  normalizeString,
  removeEmptyFields,
} from "../shared/utils/utils.js";
import { Customer } from "../models/customer.model.js";

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
      version,
      status,
    } = req.body;

    const component = await Component.findOne({ where: { serial: serial } });

    if (
      !!component &&
      normalizeString(component.toJSON()?.serial) != "thieuserial"
    )
      throw new Error(ERROR_COMPONENT_EXISTED);

    if (Number(level) > 3) throw new Error(ERROR_MAX_COMPONENT_LEVEL);

    if (Number(level) < 1) throw new Error(ERROR_INVALID_COMPONENT_LEVEL);

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
        version,
        status,
      })
    );

    res.send({ result: "success", component: newComponent });
  } catch (error) {
    next(error);
  }
}

export async function getListComponent(req, res, next) {
  try {
    let {
      q,
      page,
      limit,
      type,
      level,
      parentId,
      productId,
      projectId,
      status,
      customerId,
      situation,
    } = req.query;

    q = q ?? "";

    let productIds = [];

    // Retrieve product IDs based on projectId
    const products = await Product.findAll({
      where: { project_id: projectId ?? "" },
      attributes: ["id"],
    });

    productIds = products.map((product) => product.id);

    // Build conditions for filtering components
    const conditions = {
      [Op.or]: [
        { serial: { [Op.like]: `%${q}%` } },
        { category: { [Op.like]: `%${q}%` } },
        { name: { [Op.like]: `%${q}%` } },
      ],
      [Op.and]: [
        !!type ? { type } : undefined,
        !!productId ? { product_id: productId } : undefined,
        !!parentId ? { parent_id: parentId } : undefined,
        !!level ? { level } : undefined,
        !!status ? { status } : undefined,
        !!situation ? { situation } : undefined,
        { product_id: { [Op.in]: productIds } },
      ].filter(Boolean),
    };

    // Add customer filter condition
    const customerCondition = customerId
      ? { id: customerId } // Filter by customer_id
      : undefined;

    // Define query options
    const queryOptions = {
      where: conditions,
      order: [["product_id", "DESC"]],
      include: [
        {
          model: Issue,
          as: "issues",
        },
        {
          model: Product,
          as: "product",
          attributes: ["name", "serial", "customer_id"],
          include: {
            model: Customer,
            as: "customer",
            attributes: ["military_region", "name", "id"],
            where: customerCondition,
          },
        },
      ],
    };

    // Handle pagination
    if (isValidNumber(limit) && isValidNumber(page)) {
      limit = _.toNumber(limit);
      page = _.toNumber(page);
      queryOptions.limit = limit;
      queryOptions.offset = limit * page;
    }

    // Fetch components
    const components = await Component.findAndCountAll(queryOptions);

    for (const [index, component] of components.rows.entries()) {
      // Calculate order number
      component.dataValues.orderNumber =
        index + 1 + (isValidNumber(limit) ? limit * page : 0);
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
    version,
    status,
  } = req.body;

  try {
    let component = await Component.findOne({
      where: { id: componentId },
    });

    if (!component?.toJSON()) {
      throw new Error(ERROR_COMPONENT_NOT_EXISTED);
    }

    if (Number(level) > 3) throw new Error(ERROR_MAX_COMPONENT_LEVEL);

    if (Number(level) < 1) throw new Error(ERROR_INVALID_COMPONENT_LEVEL);

    if (Number(level) > 1 && !parentId)
      throw new Error(ERROR_COMPONENT_PARENT_IS_REQUIRED);

    await component.update({
      ...removeEmptyFields({
        parent_id: parentId,
        product_id: productId,
        type,
        serial,
        category,
        level,
        name,
        version,
        status,
      }),
      description,
    });

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
      Issue.findAll({
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
