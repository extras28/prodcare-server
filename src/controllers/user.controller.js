import _ from "lodash";
import { Op } from "sequelize";
import { Account } from "../models/account.model.js";
import {
  ERROR_ACCOUNT_EXISTED,
  ERROR_ACCOUNT_NOT_EXISTED,
  ERROR_INVALID_PARAMETERS,
} from "../shared/errors/error.js";
import { genSavedPassword } from "../shared/utils/account.helper.js";
import {
  generateRandomStr,
  isValidNumber,
  removeEmptyFields,
  removeFile,
} from "../shared/utils/utils.js";

export async function createNewUser(req, res, next) {
  const { email, name, employeeId, phone, title, dob, role, password } =
    req.body;

  const avatar = !!req.file ? `/resource/${req.file.path}` : null;

  try {
    const isAccountExisted = await Account.findOne({
      where: {
        [Op.or]: [{ email: email }, { employee_id: employeeId }],
      },
    });

    if (!!isAccountExisted) {
      throw new Error(ERROR_ACCOUNT_EXISTED);
    }

    const salt = generateRandomStr(6);
    const passwordToSave = genSavedPassword(password, salt);

    await Account.create({
      email,
      name,
      employee_id: employeeId,
      phone,
      title,
      dob,
      role,
      salt,
      avatar,
      password: passwordToSave,
    });

    res.send({ result: "success" });
  } catch (error) {
    if (avatar) {
      removeFile(req.file.path);
    }
    next(error);
  }
}

export async function getListUser(req, res, next) {
  try {
    let { q, page, limit } = req.query;

    q = q ?? "";

    const conditions = {
      [Op.or]: [
        {
          email: { [Op.like]: `%${q}%` },
        },
        {
          name: { [Op.like]: `%${q}%` },
        },
        {
          phone: { [Op.like]: `%${q}%` },
        },
        {
          employee_id: { [Op.like]: `%${q}%` },
        },
      ],
      // [Op.and]: [{ email: { [Op.notLike]: req.email } }],
    };

    let users;

    if (!isValidNumber(limit) || !isValidNumber(page)) {
      page = undefined;
      limit = undefined;

      users = await Account.findAndCountAll({
        where: conditions,
        attributes: { exclude: ["password", "salt"] },
        order: [["email", "DESC"]],
      });
    } else {
      limit = _.toNumber(limit);
      page = _.toNumber(page);

      users = await Account.findAndCountAll({
        where: conditions,
        attributes: { exclude: ["password", "salt"] },
        limit,
        offset: limit * page,
        order: [["email", "DESC"]],
      });
    }

    res.send({
      result: "success",
      page,
      total: users.count,
      count: users.rows.length,
      users: users.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  const { email, name, employeeId, phone, title, dob, role, password } =
    req.body;

  const avatar = !!req.file ? `/resource/${req.file.path}` : null;
  try {
    let user = await Account.findOne({
      attributes: { exclude: ["password", "salt"] },
      where: { email, email },
    });

    if (!user?.toJSON()) {
      throw new Error(ERROR_ACCOUNT_NOT_EXISTED);
    }

    let salt = !!password ? generateRandomStr(6) : null;

    let savedPassword = !!password ? genSavedPassword(password, salt) : null;

    if (avatar && !!user.avatar) {
      removeFile(user.avatar.replace("/resource/", ""));
    }

    await user.update(
      removeEmptyFields({
        email,
        name,
        employee_id: employeeId,
        phone,
        title,
        dob,
        role,
        password: savedPassword,
        avatar,
        salt,
      })
    );

    res.send({ result: "success" });
  } catch (error) {
    if (avatar) {
      removeFile(req.file.path);
    }
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const { employeeIds, avatars } = req.body;

    if (!_.isArray(employeeIds)) throw new Error(ERROR_INVALID_PARAMETERS);

    let deleteCount = await Account.destroy({
      where: { employee_id: { [Op.in]: employeeIds } },
    });

    avatars.forEach((element) => {
      if (element) {
        removeFile(element.replace("/resource/", ""));
      }
    });

    res.send({ result: "success", deleteCount });
  } catch (error) {
    next(error);
  }
}
