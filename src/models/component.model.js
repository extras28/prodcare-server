import { DataTypes } from "sequelize";
import { database } from "../configs/sequelize.config.js";

export const Component = database.define(
  "component",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: { type: DataTypes.STRING },
    parent_id: { type: DataTypes.BIGINT.UNSIGNED },
    product_id: { type: DataTypes.BIGINT.UNSIGNED },
    type: { type: DataTypes.ENUM("SOFTWARE", "HARDWARE") },
    serial: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    category: { type: DataTypes.STRING },
    level: { type: DataTypes.INTEGER.UNSIGNED },
  },
  { timestamps: false }
);
