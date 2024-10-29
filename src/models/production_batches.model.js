import { DataTypes } from "sequelize";
import { database } from "../configs/sequelize.config.js";

export const ProductionBatches = database.define(
  "production_batches",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING },
    start_date: { type: DataTypes.DATE },
    end_date: { type: DataTypes.DATE },
  },
  { timestamps: false }
);
