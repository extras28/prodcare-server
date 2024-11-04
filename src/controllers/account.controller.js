import { AccessToken } from "../models/access_token.model.js";
import { Account } from "../models/account.model.js";
import { ERROR_ACCOUNT_NOT_EXISTED } from "../shared/errors/error.js";

export async function getAccountInformation(req, res, next) {
  try {
    const email = req.email;

    const account = await Account.findOne({
      where: { email: email },
      attributes: { exclude: ["password", "salt"] },
    });

    const accessToken = await AccessToken.findOne({
      where: { account_id: email },
    });

    res.send({
      result: "success",
      account,
      AccessToken,
      accessTokenExpireDate: accessToken["expiry_date"],
    });

    if (!account) throw new Error(ERROR_ACCOUNT_NOT_EXISTED);
  } catch (error) {
    next(error);
  }
}
