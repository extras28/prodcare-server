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

Component.prototype.getComponentPath = async function () {
  let component = this;
  let path = component.name;

  // Traverse the component hierarchy to build the full path
  while (component.parent_id) {
    component = await Component.findByPk(component.parent_id);
    if (component) {
      path = component.name + "/" + path;
    } else {
      break;
    }
  }

  return path;
};
