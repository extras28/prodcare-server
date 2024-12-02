import { DataTypes } from "sequelize";
import { database } from "../configs/sequelize.config.js";

export const Product = database.define(
  "product",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: { type: DataTypes.STRING },
    serial: { type: DataTypes.STRING, unique: true, allowNull: true },
    type: { type: DataTypes.ENUM("MANUFACTURING", "HAND_OVER") },
    project_id: { type: DataTypes.STRING },
    version: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING },
    produontion_batches_id: { type: DataTypes.STRING },
    mfg: { type: DataTypes.DATE },
    handed_over_time: { type: DataTypes.DATE },
    exp_date: { type: DataTypes.DATE },
    customer_id: { type: DataTypes.BIGINT.UNSIGNED },
    warranty_status: { type: DataTypes.STRING },
  },
  {
    timestamps: false,
  }
);
