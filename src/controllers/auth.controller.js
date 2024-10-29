import moment from "moment";
import { Op } from "sequelize";
import { AccessToken } from "../models/access_token.model.js";
import { Account } from "../models/account.model.js";
import {
  ERROR_ACCOUNT_EXISTED,
  ERROR_INCORRECT_LOGIN_INFORMATION,
  ERROR_PASSWORD_MUST_NOT_BE_SAME,
  ERROR_USER_NOT_FOUND,
  ERROR_WRONG_PASSWORD,
} from "../shared/errors/error.js";
import {
  genSavedPassword,
  validatePassword,
} from "../shared/utils/account.helper.js";
import { jwtHelper } from "../shared/utils/jwt.helper.js";
import {
  generateRandomStr,
  hashSHA256,
  isAllNumbers,
} from "../shared/utils/utils.js";

export async function signUp(req, res, next) {
  try {
    const { email, password, name, phone, employeeId, title, dob } = req.body;

    const isAccountExisted = await Account.findOne({
      where: {
        [Op.or]: [{ email: email }, { employee_id: employeeId }],
      },
    });

    if (!!isAccountExisted) throw new Error(ERROR_ACCOUNT_EXISTED);

    const salt = generateRandomStr(6);
    const passwordToSave = genSavedPassword(password, salt);

    await Account.create({
      email,
      salt,
      password: passwordToSave,
      name,
      phone,
      title,
      dob,
      employee_id: employeeId,
      role: "ADMIN",
    });

    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}

export async function signIn(req, res, next) {
  try {
    let { username, password, remember } = req.body;

    let account;

    if (isAllNumbers(username)) {
      account = await Account.findOne({ where: { employee_id: username } });
    } else {
      username = username.includes("@")
        ? username
        : `${username}@viettel.com.vn`;

      account = await Account.findOne({ where: { email: username } });
    }

    if (!account) throw new Error(ERROR_USER_NOT_FOUND);

    if (!validatePassword(password, account.salt, account.password)) {
      throw new Error(ERROR_INCORRECT_LOGIN_INFORMATION);
    }

    let accessToken = jwtHelper.genAccountAccessToken(
      { ...account.toJSON() },
      remember
    );

    let expireAt = remember
      ? moment().add(7, "days")
      : moment().add(process.env.JWT_ACCESS_EXPIRATION, "seconds");

    await AccessToken.create({
      token: hashSHA256(accessToken),
      account_id: account.email,
      expiry_date: expireAt,
    });

    res.status(200).send({
      result: "success",
      account: Object.fromEntries(
        Object.entries(account.toJSON()).filter(
          ([key]) => !["password", "salt"].includes(key)
        )
      ),
      accessToken,
      accessTokenExpireDate: expireAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function signOut(req, res, next) {
  try {
    let accessToken = req.accessToken;
    if (accessToken) {
      await AccessToken.destroy({
        where: {
          token: hashSHA256(accessToken),
          account_id: req.email,
        },
      });
    }

    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    let { oldPassword, newPassword } = req.body;

    let account = await Account.findOne({ where: { email: req.email } });

    if (!validatePassword(oldPassword, account.salt, account.password)) {
      throw new Error(ERROR_WRONG_PASSWORD);
    }

    if (newPassword === oldPassword)
      throw new Error(ERROR_PASSWORD_MUST_NOT_BE_SAME);

    let salt = generateRandomStr(6);

    let savedPassword = genSavedPassword(newPassword, salt);

    await account.update({ password: savedPassword, salt });

    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}
