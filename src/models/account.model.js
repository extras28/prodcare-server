import { DataTypes } from "sequelize";
import { database } from "../configs/sequelize.config.js";

export const Account = database.define(
  "account",
  {
    email: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING(256) },
    employee_id: { type: DataTypes.STRING },
    phone: {
      type: DataTypes.STRING(20),
    },
    title: {
      type: DataTypes.STRING(256),
    },
    password: {
      type: DataTypes.STRING(256),
    },
    avatar: {
      type: DataTypes.STRING(500),
    },
    dob: {
      type: DataTypes.DATE,
    },
    salt: {
      type: DataTypes.STRING(16),
    },
    role: {
      type: DataTypes.ENUM("ADMIN", "OPERATOR", "USER", "GUEST"),
      defaultValue: "USER",
    },
  },
  {
    timestamps: false,
    tableName: "accounts",
  }
);
