import { DataTypes } from "sequelize";
import { database } from "../configs/sequelize.config.js";

export const Project = database.define(
  "projects",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    project_pm: { type: DataTypes.STRING },
    project_name: { type: DataTypes.STRING },
    note: { type: DataTypes.TEXT },
  },
  {
    timestamps: false,
  }
);
