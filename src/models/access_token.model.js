import { DataTypes } from "sequelize";
import { database } from "../configs/sequelize.config.js";

export const AccessToken = database.define("access-token", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  token: {
    type: DataTypes.STRING,
  },
  expiry_date: {
    type: DataTypes.DATE,
  },
  account_id: {
    type: DataTypes.STRING,
  },
});
