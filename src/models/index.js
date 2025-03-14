import { AccessToken } from "./access_token.model.js";
import { Account } from "./account.model.js";
import { Component } from "./component.model.js";
import { Customer } from "./customer.model.js";
import { Event } from "./event.model.js";
import { Issue } from "./issue.model.js";
import { Product } from "./product.model.js";
import { Project } from "./project.model.js";
import { ShowingIssueColumn } from "./showing_issue_column.model.js";
import { Version } from "./version.model.js";

export * from "./access_token.model.js";
export * from "./account.model.js";
export * from "./component.model.js";
export * from "./customer.model.js";
export * from "./event.model.js";
export * from "./issue.model.js";
export * from "./product.model.js";
export * from "./project.model.js";
export * from "./version.model.js";
export * from "./showing_issue_column.model.js";
// export * from "./reason.model.js";

// associations

Account.hasMany(Project, {
  foreignKey: "project_pm",
  sourceKey: "email",
  onDelete: "SET NULL",
});
Project.hasMany(Product, {
  foreignKey: "project_id",
  sourceKey: "id",
  onDelete: "CASCADE",
});

Product.belongsTo(Project, {
  foreignKey: "project_id",
  targetKey: "id",
  onDelete: "CASCADE",
});

Product.hasMany(Component, {
  foreignKey: "product_id",
  sourceKey: "id",
  onDelete: "CASCADE",
  as: "components",
});

Component.belongsTo(Product, {
  foreignKey: "product_id",
  targetKey: "id",
  onDelete: "CASCADE",
});

Product.hasMany(Issue, {
  foreignKey: "product_id",
  sourceKey: "id",
  onDelete: "CASCADE",
});
Issue.belongsTo(Product, {
  foreignKey: "product_id",
  targetKey: "id",
  onDelete: "CASCADE",
});

Component.hasMany(Version, { foreignKey: "component_id", sourceKey: "id" });

Project.hasMany(Issue, {
  foreignKey: "project_id",
  sourceKey: "id",
});
Issue.belongsTo(Project, {
  foreignKey: "project_id",
  targetKey: "id",
  onDelete: "CASCADE",
});

Issue.belongsTo(Account, {
  targetKey: "email",
  foreignKey: "account_id",
  onDelete: "SET NULL",
});

Account.hasMany(Issue, {
  foreignKey: "account_id",
  sourceKey: "email",
  onDelete: "SET NULL",
});

AccessToken.belongsTo(Account, {
  foreignKey: "account_id",
  targetKey: "email",
  onDelete: "CASCADE",
});

Component.hasMany(Component, {
  as: "children",
  foreignKey: "parent_id",
  sourceKey: "id",
});

Component.belongsTo(Component, {
  as: "parent",
  foreignKey: "parent_id",
  sourceKey: "id",
});

Issue.belongsTo(Customer, {
  foreignKey: "customer_id",
  targetKey: "id",
  onDelete: "SET NULL",
});

Product.belongsTo(Customer, {
  foreignKey: "customer_id",
  targetKey: "id",
  onDelete: "SET NULL",
});
Customer.hasMany(Product, {
  foreignKey: "customer_id",
  sourceKey: "id",
  onDelete: "SET NULL",
});

Product.hasMany(Event, { foreignKey: "product_id", sourceKey: "id" });

Component.hasMany(Event, { foreignKey: "component_id", sourceKey: "id" });

Project.hasMany(Event, { foreignKey: "project_id", sourceKey: "id" });

Account.hasMany(Event, { foreignKey: "account_id", sourceKey: "email" });
Event.belongsTo(Account, {
  foreignKey: "account_id",
  targetKey: "email",
  onDelete: "SET NULL",
});

Issue.hasMany(Event, { foreignKey: "issue_id", sourceKey: "id" });
Event.belongsTo(Issue, { foreignKey: "issue_id", targetKey: "id" });

Component.hasMany(Issue, {
  foreignKey: "component_id",
  sourceKey: "id",
  onDelete: "CASCADE",
});
Issue.belongsTo(Component, {
  foreignKey: "component_id",
  targetKey: "id",
  onDelete: "CASCADE",
});

ShowingIssueColumn.belongsTo(Account, {
  foreignKey: "account_id",
  targetKey: "email",
  onDelete: "SET NULL",
});
Account.hasOne(ShowingIssueColumn, {
  foreignKey: "account_id",
  sourceKey: "email",
  onDelete: "CASCADE",
});
