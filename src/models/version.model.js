import { DataTypes } from "sequelize";
import { database } from "../configs/sequelize.config.js";

export const Version = database.define(
  "version",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    component_id: { type: DataTypes.BIGINT.UNSIGNED },
    name: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
  },
  { timestamps: false }
);
