import { DataTypes } from "sequelize";
import { database } from "../configs/sequelize.config.js";

export const Customer = database.define(
  "customer",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    sign: { type: DataTypes.STRING },
    military_region: { type: DataTypes.STRING },
    name: { type: DataTypes.STRING },
    contact_person_name: { type: DataTypes.STRING },
    contact_person_title: { type: DataTypes.STRING },
    code_number: { type: DataTypes.STRING, comment: "số hiệu" },
    phone: { type: DataTypes.STRING },
    address: { type: DataTypes.STRING },
  },
  { timestamps: false }
);
