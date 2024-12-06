import { AccessToken } from "../models/access_token.model.js";
import { Account } from "../models/account.model.js";
import { ShowingIssueColumn } from "../models/showing_issue_column.model.js";
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

export async function adjustIssueColumns(req, res, next) {
  try {
    const { columnIds } = req.body;

    const showingColumn = await ShowingIssueColumn.findOne({
      where: { account_id: req.email },
    });

    await showingColumn.update({ columns: Array(columnIds).join(",") });

    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}

export async function getIssueColumns(req, res, next) {
  try {
    const showingColumn = await ShowingIssueColumn.findOne({
      where: { account_id: req.email },
    });

    res.send({ result: "success", showingColumn });
  } catch (error) {
    next(error);
  }
}
