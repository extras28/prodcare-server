import _ from "lodash";
import { Op } from "sequelize";
import { Product } from "../models/product.model.js";
import { Project } from "../models/project.model.js";
import {
  ERROR_INVALID_PARAMETERS,
  ERROR_MFG_IS_AFTER_HANDED_OVER_TIME,
  ERROR_PRODUCT_EXISTED,
  ERROR_PRODUCT_NOT_EXISTED,
} from "../shared/errors/error.js";
import { isValidNumber, removeEmptyFields } from "../shared/utils/utils.js";
import { Customer } from "../models/customer.model.js";
import { Issue } from "../models/issue.model.js";
import { Account } from "../models/account.model.js";
import { Event } from "../models/event.model.js";
import moment from "moment";
import { Component } from "../models/component.model.js";

export async function createProduction(req, res, next) {
  try {
    const {
      serial,
      name,
      type,
      projectId,
      productionBatchesId,
      version,
      status,
      mfg,
      handedOverTime,
      customerId,
    } = req.body;

    const product = await Product.findOne({ where: { serial: serial } });

    if (!!product) throw new Error(ERROR_PRODUCT_EXISTED);

    if (moment(mfg).isAfter(moment(handedOverTime)))
      throw new Error(ERROR_MFG_IS_AFTER_HANDED_OVER_TIME);

    const newProduct = await Product.create(
      removeEmptyFields({
        project_id: projectId,
        productionBatches_id: productionBatchesId,
        type,
        name,
        serial,
        version,
        status,
        mfg,
        handed_over_time: handedOverTime,
        customer_id: customerId,
      })
    );

    res.send({ result: "success", product: newProduct });
  } catch (error) {
    next(error);
  }
}

export async function getListProductInTree(req, res, next) {
  try {
    let { q, page, limit, type, projectId, productionBatchesId, customerId } =
      req.query;

    q = q ?? "";

    let projectIds = [];

    if (req.account.role === "USER") {
      const userProjects = await Project.findAll({
        where: { project_pm: req.account.email },
        attributes: ["id"],
      });

      projectIds = userProjects.map((project) => project.id);
    }

    const conditions = {
      [Op.or]: [
        { serial: { [Op.like]: `%${q}%` } },
        { status: { [Op.like]: `%${q}%` } },
        { name: { [Op.like]: `%${q}%` } },
      ],
      [Op.and]: [
        !!type ? { type } : undefined,
        !!projectId ? { project_id: projectId } : undefined,
        !!customerId ? { customer_id: customerId } : undefined,
        !!productionBatchesId
          ? { production_batches_id: productionBatchesId }
          : undefined,
        req.account.role === "USER"
          ? { project_id: { [Op.in]: projectIds } }
          : undefined,
      ].filter(Boolean),
    };

    const includes = [
      {
        model: Component,
        as: "components",
        include: [
          {
            model: Component,
            as: "children",
            include: [
              {
                model: Component,
                as: "children",
              },
            ],
          },
        ],
      },
    ];

    let products;

    if (!isValidNumber(limit) || !isValidNumber(page)) {
      page = undefined;
      limit = undefined;

      products = await Product.findAndCountAll({
        where: conditions,
        order: [["id", "DESC"]],
        include: [
          {
            model: Component,
            as: "components",
            include: [
              {
                model: Component,
                as: "children",
                include: [
                  {
                    model: Component,
                    as: "children",
                  },
                ],
              },
            ],
          },
        ],
      });
    } else {
      limit = _.toNumber(limit);
      page = _.toNumber(page);

      products = await Product.findAndCountAll({
        where: conditions,
        limit,
        offset: limit * page,
        order: [["id", "DESC"]],
        include: [
          {
            model: Component,
            required: false, // Makes it a LEFT OUTER JOIN
            where: { level: 1 },
            as: "components",
            include: [
              {
                model: Component,
                as: "children",
                include: [
                  {
                    model: Component,
                    as: "children",
                  },
                ],
              },
            ],
          },
        ],
      });
    }

    // const products = await Product.findAll({
    //   where: conditions,
    //   order: [["id", "DESC"]],
    //   include: [
    //     {
    //       model: Component,
    //       as: "components",
    //       include: [
    //         {
    //           model: Component,
    //           as: "children",
    //           include: [
    //             {
    //               model: Component,
    //               as: "children",
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //   ],
    // });

    const formatTreeWithPaths = async (components) =>
      Promise.all(
        components.map(async (component) => ({
          key: component.id.toString(),
          data: {
            ...component.toJSON(),

            fullPath: await component.getComponentPath(),
          },
          children: await formatTreeWithPaths(component.children || []),
        }))
      );

    const formattedProducts = await Promise.all(
      products.rows.map(async (product) => ({
        key: product.id.toString(),
        data: product.toJSON(),
        children: await formatTreeWithPaths(product.components || []),
      }))
    );

    res.send({
      result: "success",
      page,
      total: products.count,
      count: products.rows.length,
      products: formattedProducts,
    });
  } catch (error) {
    next(error);
  }
}

export async function getListProduct(req, res, next) {
  try {
    let { q, page, limit, type, projectId, productionBatchesId, customerId } =
      req.query;

    q = q ?? "";

    let projectIds = [];

    if (req.account.role === "USER") {
      const userProjects = await Project.findAll({
        where: { project_pm: req.account.email }, // Assuming project_pm is the email of the account
        attributes: ["id"], // Fetch only the project IDs
      });

      projectIds = userProjects.map((project) => project.id);
    }

    const conditions = {
      [Op.or]: [
        {
          serial: { [Op.like]: `%${q}%` },
        },
        {
          status: { [Op.like]: `%${q}%` },
        },
        {
          name: { [Op.like]: `%${q}%` },
        },
      ],
      [Op.and]: [
        !!type ? { type } : undefined,
        !!projectId ? { project_id: projectId } : undefined,
        !!customerId ? { customer_id: customerId } : undefined,
        !!productionBatchesId
          ? { production_batches_id: productionBatchesId }
          : undefined,
        req.account.role === "USER"
          ? { project_id: { [Op.in]: projectIds } }
          : undefined,
      ].filter(Boolean),
    };

    let products;

    if (!isValidNumber(limit) || !isValidNumber(page)) {
      page = undefined;
      limit = undefined;

      products = await Product.findAndCountAll({
        where: conditions,
        order: [["id", "DESC"]],
      });
    } else {
      limit = _.toNumber(limit);
      page = _.toNumber(page);

      products = await Product.findAndCountAll({
        where: conditions,
        limit,
        offset: limit * page,
        order: [["id", "DESC"]],
      });
    }

    res.send({
      result: "success",
      page,
      total: products.count,
      count: products.rows.length,
      products: products.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  const {
    productId,
    serial,
    type,
    name,
    projectId,
    productionBatchesId,
    version,
    status,
    mfg,
    handedOverTime,
    customerId,
  } = req.body;

  try {
    let product = await Product.findOne({
      where: { id: productId },
    });

    if (!product?.toJSON()) {
      throw new Error(ERROR_PRODUCT_NOT_EXISTED);
    }

    if (moment(mfg).isAfter(moment(handedOverTime)))
      throw new Error(ERROR_MFG_IS_AFTER_HANDED_OVER_TIME);

    await product.update(
      removeEmptyFields({
        name,
        project_id: projectId,
        productionBatches_id: productionBatchesId,
        type,
        serial,
        version,
        status,
        mfg,
        handed_over_time: handedOverTime,
        customer_id: customerId,
      })
    );

    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const { productIds } = req.body;

    if (!_.isArray(productIds)) throw new Error(ERROR_INVALID_PARAMETERS);

    let deleteCount = await Product.destroy({
      where: { id: { [Op.in]: productIds } },
    });

    res.send({ result: "success", deleteCount });
  } catch (error) {
    next(error);
  }
}

export async function getProductDetail(req, res, next) {
  try {
    const { id } = req.params;

    const [product, events, issues] = await Promise.all([
      Product.findOne({
        where: { id: id },
        include: [{ model: Project }, { model: Customer }],
      }),
      Event.findAndCountAll({
        where: { product_id: id },
        order: [["id", "ASC"]],
        include: {
          model: Account,
          attributes: ["email", "name", "avatar", "employee_id"],
        },
      }),
      Issue.findAndCountAll({
        where: { product_id: id },
        order: [["id", "DESC"]],
      }),
    ]);

    if (!product) throw new Error(ERROR_PRODUCT_NOT_EXISTED);

    res.send({ result: "success", product, events, issues });
  } catch (error) {
    next(error);
  }
}
