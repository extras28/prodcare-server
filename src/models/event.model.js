import { DataTypes } from "sequelize";
import { database } from "../configs/sequelize.config.js";

export const Event = database.define("event", {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  project_id: { type: DataTypes.STRING },
  account_id: { type: DataTypes.STRING },
  type: { type: DataTypes.ENUM("ISSUE", "PRODUCT", "COMPONENT") },
  sub_type: { type: DataTypes.ENUM("CREATE", "EDIT", "COMMENT") },
  content: { type: DataTypes.TEXT },
  issue_id: { type: DataTypes.BIGINT.UNSIGNED },
  product_id: { type: DataTypes.BIGINT.UNSIGNED },
  component_id: { type: DataTypes.BIGINT.UNSIGNED },
});
