import { Op } from "sequelize";
import { Customer } from "../models/customer.model.js";
import { Product } from "../models/product.model.js";
import {
  ERROR_CUSTOMER_EXISTED,
  ERROR_CUSTOMER_NOT_EXISTED,
  ERROR_INVALID_PARAMETERS,
} from "../shared/errors/error.js";
import { isValidNumber } from "../shared/utils/utils.js";
import _ from "lodash";

export async function createCustomer(req, res, next) {
  try {
    const {
      sign,
      militaryRegion,
      name,
      contactPersonName,
      contactPersonTitle,
      codeNumber,
      phone,
      address,
    } = req.body;

    const customer = await Customer.findOne({ where: { sign: sign } });

    if (!!customer) throw new Error(ERROR_CUSTOMER_EXISTED);

    await Customer.create({
      sign,
      military_region: militaryRegion,
      name,
      contact_person_name: contactPersonName,
      contact_person_title: contactPersonTitle,
      code_number: codeNumber,
      phone,
      address,
    });

    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}

export async function getListCustomer(req, res, next) {
  try {
    let { q, page, limit, militaryRegion } = req.query;

    q = q ?? "";

    const conditions = {
      [Op.or]: [
        {
          sign: { [Op.like]: `%${q}%` },
        },
        {
          name: { [Op.like]: `%${q}%` },
        },
        {
          contact_person_name: { [Op.like]: `%${q}%` },
        },
        {
          code_number: { [Op.like]: `%${q}%` },
        },
        {
          phone: { [Op.like]: `%${q}%` },
        },
        {
          address: { [Op.like]: `%${q}%` },
        },
        {
          military_region: { [Op.like]: `%${q}%` },
        },
      ],
      [Op.and]: [
        !!militaryRegion ? { military_region: militaryRegion } : undefined,
      ],
    };

    let customers;

    if (!isValidNumber(limit) || !isValidNumber(page)) {
      page = undefined;
      limit = undefined;

      customers = await Customer.findAndCountAll({
        where: conditions,
        order: [["id", "DESC"]],
      });
    } else {
      limit = _.toNumber(limit);
      page = _.toNumber(page);

      customers = await Customer.findAndCountAll({
        where: conditions,
        limit,
        offset: limit * page,
        order: [["id", "DESC"]],
      });
    }

    res.send({
      result: "success",
      page,
      total: customers.count,
      count: customers.rows.length,
      customers: customers.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req, res, next) {
  const {
    id,
    sign,
    militaryRegion,
    name,
    contactPersonName,
    contactPersonTitle,
    codeNumber,
    phone,
    address,
  } = req.body;

  try {
    let customer = await Customer.findOne({
      where: { id, id },
    });

    if (!customer?.toJSON()) {
      throw new Error(ERROR_CUSTOMER_NOT_EXISTED);
    }

    await customer.update({
      sign,
      military_region: militaryRegion,
      name,
      contact_person_name: contactPersonName,
      contact_person_title: contactPersonTitle,
      code_number: codeNumber,
      phone,
      address,
    });

    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req, res, next) {
  try {
    const { customerIds } = req.body;

    if (!_.isArray(customerIds)) throw new Error(ERROR_INVALID_PARAMETERS);

    let deleteCount = await Customer.destroy({
      where: { id: { [Op.in]: customerIds } },
    });

    res.send({ result: "success", deleteCount });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerDetail(req, res, next) {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({
      where: { id: id },
      include: { model: Product },
    });

    if (!customer) throw new Error(ERROR_CUSTOMER_NOT_EXISTED);

    res.send({ result: "success", customer });
  } catch (error) {
    next(error);
  }
}
