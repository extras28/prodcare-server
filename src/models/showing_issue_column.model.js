import { DataTypes } from "sequelize";
import { database } from "../configs/sequelize.config.js";

export const ShowingIssueColumn = database.define(
  "showing_issue_column",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    account_id: { type: DataTypes.STRING },
    columns: {
      type: DataTypes.STRING,
      defaultValue: "1,2,3,4,5,6,7,8,36",
    },
  },
  {
    timestamps: false,
    tableName: "showing_issue_columns",
  }
);
