import _ from "lodash";
import { Op } from "sequelize";
import { Account } from "../models/account.model.js";
import { Component } from "../models/component.model.js";
import { Event } from "../models/event.model.js";
import { Issue } from "../models/issue.model.js";
import { Product } from "../models/product.model.js";
import * as XLSX from "xlsx";
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
      temporarilyUse,
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

    if (Number(level) > 4) throw new Error(ERROR_MAX_COMPONENT_LEVEL);

    if (Number(level) < 1) throw new Error(ERROR_INVALID_COMPONENT_LEVEL);

    if (Number(level) > 1 && !parentId)
      throw new Error(ERROR_COMPONENT_PARENT_IS_REQUIRED);

    if (Number(level) == 1 && !productId)
      throw new Error(ERROR_PRODUCT_IS_REQUIRED);

    const newComponentData = removeEmptyFields({
      parent_id: parentId,
      product_id: productId,
      type,
      serial,
      description,
      category,
      level,
      name,
      version,
      status: status || (temporarilyUse === "YES" ? "DEGRADED" : ""),
      temporarily_use: temporarilyUse,
      situation: temporarilyUse == "YES" ? "DEGRADED" : "GOOD",
    });

    const promises = [Component.create(newComponentData)];

    const [newComponent] = await Promise.all(promises);

    await updateProductSituation(productId);

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
        { name: { [Op.like]: `%${q}%` } },
        { version: { [Op.like]: `%${q}%` } },
      ],
      [Op.and]: [
        !!type ? { type } : undefined,
        !!productId ? { product_id: productId } : undefined,
        !!parentId ? { parent_id: parentId } : undefined,
        !!level ? { level } : undefined,
        !!status ? { status } : undefined,
        !!situation ? { situation } : undefined,
        !productId ? { product_id: { [Op.in]: productIds } } : undefined,
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

    if (isValidNumber(limit) && isValidNumber(page)) {
      limit = _.toNumber(limit);
      page = _.toNumber(page);
      queryOptions.limit = limit;
      queryOptions.offset = limit * page;
    }

    const [total, components] = await Promise.all([
      Component.count({ where: conditions }),
      Component.findAndCountAll(queryOptions),
    ]);
    for (const [index, component] of components.rows.entries()) {
      // Calculate order number
      component.dataValues.orderNumber =
        index + 1 + (isValidNumber(limit) ? limit * page : 0);
    }

    res.send({
      result: "success",
      page,
      total: total,
      count: components.rows.length,
      components: components.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateComponent(req, res, next) {
  const {
    temporarilyUse,
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
    const existedComponent = await Component.findOne({
      where: { serial: serial },
    });

    if (
      !!existedComponent &&
      normalizeString(existedComponent.toJSON()?.serial) != "thieuserial"
    )
      throw new Error(ERROR_COMPONENT_EXISTED);

    let component = await Component.findOne({
      where: { id: componentId },
    });

    if (!component?.toJSON()) {
      throw new Error(ERROR_COMPONENT_NOT_EXISTED);
    }

    if (Number(level) > 4) throw new Error(ERROR_MAX_COMPONENT_LEVEL);

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
        temporarily_use: temporarilyUse,
        situation: temporarilyUse == "YES" ? "DEGRADED" : "GOOD",
      }),
      description,
    });

    if (temporarilyUse == "YES") {
      await Issue.update(
        { temporarily_use: "YES" },
        { where: { component_id: componentId } }
      );
    } else {
      await Issue.update(
        { temporarily_use: "NO" },
        { where: { component_id: componentId } }
      );
      const issueProcessedCount = await Issue.count({
        where: { component_id: componentId, status: { [Op.ne]: "PROCESSED" } },
      });

      if (issueProcessedCount > 0) {
        await Component.update(
          { situation: "DEFECTIVE" },
          { where: { id: componentId } }
        );
      } else {
        await Component.update(
          { situation: "GOOD" },
          { where: { id: componentId } }
        );
      }
    }

    await updateProductSituation(component.toJSON().product_id);

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
        include: [{ model: Product, include: { model: Customer } }],
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

async function updateProductSituation(productId) {
  const defectiveComponentCount = await Component.count({
    where: { product_id: productId, situation: "DEFECTIVE" },
  });
  const degradedComponentCount = await Component.count({
    where: { product_id: productId, situation: "DEGRADED" },
  });

  if (defectiveComponentCount > 0) {
    await Product.update(
      { situation: "DEFECTIVE" },
      { where: { id: productId } }
    );

    return;
  }

  if (degradedComponentCount > 0) {
    await Product.update(
      { situation: "DEGRADED" },
      { where: { id: productId } }
    );

    return;
  }

  await Product.update({ situation: "GOOD" }, { where: { id: productId } });
}

export async function readFromExcel(req, res, next) {
  try {
    const { productId, level } = req.query;
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

    const excludeCells = new Set([
      "Mất nguồn",
      "Không khởi động được",
      "Không hoạt động",
      "không có tín hiệu",
      "Chập chờn",
      "Nứt",
      "Vênh",
      "Tín hiệu quang không thông",
      "Han rỉ",
      "Bị vào nước",
      "Móp méo",
      "Hỏng khối nguồn",
      "Cháy",
      "Đứt dây",
      "không thông",
      "Vỡ gá kim",
      "Quay chậm bất thường",
      "thủng ống tyo hơi",
      "nổ máy có tiếng kêu bất thường",
      "Nứt, phồng vỏ",
      "Không tích điện",
      "Không có điện áp nạp bù từ máy phát nạp",
      "Không có điện áp nạp bù từ điện lưới",
      "Gẫy cánh",
      "Dây tín hiệu chập chờn",
      "Gá đế chân chống điện bị gãy chốt",
      "Gá đế chân chống cơ bị gãy chốt.",
      "Bị kẹt",
    ]);

    const createComponents = async (
      components,
      parentId = null,
      componentLevel
    ) => {
      const filteredComponents = components.filter(
        (comp) => !excludeCells.has(comp)
      );
      const componentData = filteredComponents.map((name) => ({
        name,
        parent_id: parentId,
        product_id: productId,
        serial: "thiếu serial",
        type: "HARDWARE",
        level: componentLevel,
        status: "USING",
      }));

      await Component.bulkCreate(componentData, { ignoreDuplicates: true });
    };

    const processLevel1 = async () => {
      const sheetName = workbook.SheetNames[1];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      const componentNames = [
        Object.keys(jsonData[1])[0],
        ...jsonData.map((item) => item["HT Thu URS - XLTH  "]),
      ];

      await createComponents(componentNames, null, 1);
    };

    const processHigherLevels = async (sheetIndex, componentLevel) => {
      const sheetName = workbook.SheetNames[sheetIndex];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      const componentsByParent = jsonData.reduce((result, item) => {
        for (const [key, value] of Object.entries(item)) {
          if (!result[key]) result[key] = [];
          result[key].push(value);
        }
        return result;
      }, {});

      for (const [parentName, childComponents] of Object.entries(
        componentsByParent
      )) {
        const parent = await Component.findOne({
          where: { name: parentName, product_id: productId },
        });

        if (parent) {
          await createComponents(childComponents, parent.id, componentLevel);
        }
      }
    };

    switch (parseInt(level, 10)) {
      case 1:
        await processLevel1();
        break;
      case 2:
        await processHigherLevels(2, 2);
        break;
      case 3:
        await processHigherLevels(3, 3);
        break;
      default:
        return res.status(400).send({ error: "Invalid level provided." });
    }

    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}
