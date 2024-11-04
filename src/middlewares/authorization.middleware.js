import moment from "moment";
import { AccessToken } from "../models/access_token.model.js";
import {
  ERROR_PERMISSION_DENIED,
  ERROR_TOKEN_EXPIRED,
} from "../shared/errors/error.js";
import { jwtHelper } from "../shared/utils/jwt.helper.js";
import { hashSHA256 } from "../shared/utils/utils.js";
import { Account } from "../models/account.model.js";

const TAG = "[authorization.middleware]";

export async function authorizationMiddleware(req, res, next) {
  let tokenStr = req.headers["authorization"];
  let accessToken =
    tokenStr != null ? tokenStr.match("(?<=Bearer).*$")?.[0] : null;

  console.log(
    TAG,
    `${moment().format("DD/MM/YYYY HH:mm")} [HTTP] Processing request ${
      req.originalUrl
    } IP: ${
      req.header("x-forwarded-for") != null
        ? req.header("x-forwarded-for")
        : req.connection.remoteAddress
    } token:${accessToken} \n`
  );

  if (accessToken) {
    accessToken = accessToken.trim();

    let jwtDecoded = jwtHelper.decodeJwtToken(accessToken);

    if (!jwtHelper.verifyJWTToken(accessToken)) {
      let error = new Error(ERROR_PERMISSION_DENIED);
      error.status = 401;
      return next(error);
    }

    if (jwtHelper.isJWTTokenExpired(accessToken)) {
      let error = new Error(ERROR_TOKEN_EXPIRED);
      AccessToken.destroy({
        where: {
          token: hashSHA256(accessToken),
          account_id: jwtDecoded.email,
        },
      });
      error.status = 401;
      return next(error);
    }

    if (
      !(await AccessToken.findOne({
        where: {
          token: hashSHA256(accessToken),
          account_id: jwtDecoded.email,
        },
      }))
    ) {
      let error = new Error(ERROR_TOKEN_EXPIRED);
      error.status = 401;
      return next(error);
    }

    const account = await Account.findOne({
      where: { email: jwtDecoded.email },
      attributes: { exclude: ["password", "salt"] },
    });

    req.email = account.email;
    req.account = account;
    req.accessToken = accessToken;
  } else {
    let error = new Error(ERROR_PERMISSION_DENIED);
    error.status = 403;
    return next(error);
  }

  next();
}
