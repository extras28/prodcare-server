const _ = require("lodash");

module.exports = async (req, res, next) => {
  if (req.query) {
    for (let [key, value] of Object.entries(req.query)) {
      if (value === "undefined" || value === undefined) {
        delete req.query[key];
        value = undefined;
      }

      if (value === "null" || value === "NULL" || value === "") {
        req.query[key] = value = null;
      }

      if (typeof value == "string") {
        req.query[key] = value = value.trim();
      }

      if (typeof value == "number") {
        req.query[key] = value = String(value).trim();
      }
    }
  }

  if (req.body) {
    for (let [key, value] of Object.entries(req.body)) {
      if (value === "undefined" || value === undefined) {
        delete req.body[key];
        value = undefined;
      }

      if (value === "null" || value === "NULL") {
        req.body[key] = value = null;
      }

      if (typeof value == "string") {
        req.body[key] = value = value.trim();
      }
    }
  }

  next();
};
