import _ from "lodash";
import moment from "moment";
import { Op, Sequelize } from "sequelize";
import { Account } from "../models/account.model.js";
import { Component } from "../models/component.model.js";
import { Customer } from "../models/customer.model.js";
import { Event } from "../models/event.model.js";
import { Issue } from "../models/issue.model.js";
import { Product } from "../models/product.model.js";
import { Project } from "../models/project.model.js";
import {
    ERROR_INVALID_PARAMETERS,
    ERROR_MFG_IS_AFTER_HANDED_OVER_TIME,
    ERROR_PRODUCT_EXISTED,
    ERROR_PRODUCT_NOT_EXISTED,
} from "../shared/errors/error.js";
import { isValidNumber, removeEmptyFields } from "../shared/utils/utils.js";
import { getIssuesByComponent } from "../shared/utils/database.util.js";

export async function createProduction(req, res, next) {
    try {
        const {
            serial,
            name,
            type,
            projectId,
            productionBatchesId,
            version,
            status,
            mfg,
            handedOverTime,
            customerId,
            warrantyStatus,
        } = req.body;

        const product = await Product.findOne({ where: { serial: serial } });

        if (!!product) throw new Error(ERROR_PRODUCT_EXISTED);

        if (moment(mfg).isAfter(moment(handedOverTime))) throw new Error(ERROR_MFG_IS_AFTER_HANDED_OVER_TIME);

        const newProduct = await Product.create(
            removeEmptyFields({
                project_id: projectId,
                productionBatches_id: productionBatchesId,
                type,
                name,
                serial,
                version,
                status,
                mfg,
                handed_over_time: handedOverTime,
                customer_id: customerId,
                warranty_status: warrantyStatus,
            })
        );

        res.send({ result: "success", product: newProduct });
    } catch (error) {
        next(error);
    }
}

export async function getListProductInTree(req, res, next) {
    try {
        let {
            q,
            page,
            limit,
            type,
            projectId,
            productionBatchesId,
            customerId,
            status,
            startTime,
            endTime,
            situation,
        } = req.query;

        startTime = startTime ? moment(startTime, "YYYY-MM-DD").startOf("day").format("YYYY-MM-DD HH:mm:ss") : "";
        endTime = endTime ? moment(endTime, "YYYY-MM-DD").endOf("day").format("YYYY-MM-DD HH:mm:ss") : "";

        q = q ?? "";

        let projectIds = [];

        if (req.account.role === "USER") {
            const userProjects = await Project.findAll({
                where: { project_pm: req.account.email },
                attributes: ["id"],
            });

            projectIds = userProjects.map((project) => project.id);
        }

        const conditions = {
            [Op.or]: [{ serial: { [Op.like]: `%${q}%` } }, { name: { [Op.like]: `%${q}%` } }],
            [Op.and]: [
                !!type ? { type } : undefined,
                !!projectId ? { project_id: projectId } : undefined,
                !!customerId ? { customer_id: customerId } : undefined,
                !!status ? { status: status } : undefined,
                !!situation ? { situation: situation } : undefined,
                !!productionBatchesId ? { production_batches_id: productionBatchesId } : undefined,
                req.account.role === "USER" ? { project_id: { [Op.in]: projectIds } } : undefined,
                !!startTime && !!endTime
                    ? {
                          handed_over_time: { [Op.between]: [startTime, endTime] },
                      }
                    : undefined,
            ].filter(Boolean),
        };

        const buildIncludeTree = (depth = 4) => {
            if (depth === 0) return [];

            return [
                {
                    model: Issue,
                    as: "issues",
                    attributes: ["status"],
                },
                {
                    model: Component,
                    as: "children",
                    attributes: { exclude: ["temporarily_use", "category"] },
                    include: buildIncludeTree(depth - 1), // Recursively build the include tree
                },
            ];
        };

        const fetchProducts = async (conditions, limit, page) => {
            const isPaginated = isValidNumber(limit) && isValidNumber(page);

            if (isPaginated) {
                limit = _.toNumber(limit);
                page = _.toNumber(page);
            } else {
                limit = undefined;
                page = undefined;
            }

            const products = await Product.findAndCountAll({
                where: conditions,
                limit: isPaginated ? limit : undefined,
                offset: isPaginated ? limit * page : undefined,
                order: [["id", "DESC"]],
                include: [
                    {
                        model: Component,
                        attributes: { exclude: ["temporarily_use", "category"] },
                        required: false, // Makes it a LEFT OUTER JOIN
                        where: { level: 1 },
                        as: "components",
                        include: buildIncludeTree(3), // Dynamically build the include tree up to 3 levels deep
                    },
                    {
                        model: Issue,
                        as: "issues",
                        attributes: ["status"],
                    },
                ],
            });

            let total = undefined;
            if (isPaginated) {
                total = await Product.count({
                    where: conditions,
                    limit,
                    offset: limit * page,
                });
            }

            return { products, total };
        };

        // Usage
        let { products, total } = await fetchProducts(conditions, limit, page);

        let uniqueKeyCounter = 1; // Initialize a global counter for unique keys

        const countIssues = (component) => {
            // Count issues for the current component and its children recursively
            const currentIssuesCount = component.issues?.filter((is) => is?.status != "PROCESSED")?.length || 0;
            const childrenIssuesCount = (component.children || []).reduce((sum, child) => sum + countIssues(child), 0);

            return currentIssuesCount + childrenIssuesCount;
        };

        const formatTreeWithPaths = async (components) =>
            Promise.all(
                components.map(async (component) => ({
                    key: (uniqueKeyCounter++).toString(), // Increment counter for a unique key
                    data: {
                        ...component.toJSON(),
                        fullPath: await component.getComponentPath(),
                        count: countIssues(component), // Add the total issue count
                    },
                    children: await formatTreeWithPaths(component.children || []),
                }))
            );

        const formattedProducts = await Promise.all(
            products.rows.map(async (product, index) => ({
                key: (uniqueKeyCounter++).toString(), // Increment counter for a unique key
                data: {
                    ...product.toJSON(),
                    orderNumber: index + 1 + (limit ?? 0) * (page ?? 0),
                },
                children: await formatTreeWithPaths(product.components || []),
            }))
        );

        res.send({
            result: "success",
            page,
            total: total,
            count: products.rows.length,
            products: formattedProducts,
        });
    } catch (error) {
        next(error);
    }
}

export async function getListProduct(req, res, next) {
    try {
        let { q, page, limit, type, projectId, productionBatchesId, customerId } = req.query;

        q = q ?? "";

        let projectIds = [];

        if (req.account.role === "USER") {
            const userProjects = await Project.findAll({
                where: { project_pm: req.account.email }, // Assuming project_pm is the email of the account
                attributes: ["id"], // Fetch only the project IDs
            });

            projectIds = userProjects.map((project) => project.id);
        }

        const conditions = {
            [Op.or]: [
                {
                    serial: { [Op.like]: `%${q}%` },
                },
                {
                    status: { [Op.like]: `%${q}%` },
                },
                {
                    name: { [Op.like]: `%${q}%` },
                },
            ],
            [Op.and]: [
                !!type ? { type } : undefined,
                !!projectId ? { project_id: projectId } : undefined,
                !!customerId ? { customer_id: customerId } : undefined,
                !!productionBatchesId ? { production_batches_id: productionBatchesId } : undefined,
                req.account.role === "USER" ? { project_id: { [Op.in]: projectIds } } : undefined,
            ].filter(Boolean),
        };

        let products;
        let total;

        if (!isValidNumber(limit) || !isValidNumber(page)) {
            page = undefined;
            limit = undefined;

            products = await Product.findAndCountAll({
                where: conditions,
                order: [["id", "DESC"]],
                include: [
                    {
                        model: Component,
                        as: "components",
                        attributes: [], // Exclude individual component fields to avoid clutter
                    },
                ],
                attributes: {
                    include: [
                        [
                            Sequelize.literal(
                                `(SELECT COUNT(*) FROM components WHERE components.product_id = product.id)`
                            ),
                            "componentCount", // Alias for the count of components
                        ],
                    ],
                },
            });
        } else {
            limit = Number(limit); // Chuyển đổi số nếu cần
            page = Number(page);

            [products, total] = await Promise.all([
                Product.findAndCountAll({
                    where: conditions,
                    limit,
                    offset: limit * page,
                    order: [["id", "DESC"]],
                    include: [
                        {
                            model: Component,
                            as: "components",
                            where: { level: 1 },
                        },
                        { model: Issue, as: "issues", attributes: ["id", "status"] },
                    ],
                }),
                Product.count({ where: conditions }),
            ]);

            // Xử lý dữ liệu đồng thời
            await Promise.all(
                products.rows.map(async (product, index) => {
                    product.dataValues.order = limit * page + index + 1;

                    // Lấy danh sách issues của tất cả components trong product
                    const issuesPromises = product.components.map(async (component) => {
                        component.dataValues.issues = await getIssuesByComponent(component.id);
                    });

                    // Đợi tất cả các issues được lấy xong
                    await Promise.all(issuesPromises);
                })
            );
        }

        res.send({
            result: "success",
            page,
            total: total,
            count: products.rows.length,
            products: products.rows,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateProduct(req, res, next) {
    const {
        productId,
        serial,
        type,
        name,
        projectId,
        productionBatchesId,
        version,
        status,
        mfg,
        handedOverTime,
        customerId,
        warrantyStatus,
    } = req.body;

    try {
        let product = await Product.findOne({
            where: { id: productId },
        });

        if (!product?.toJSON()) {
            throw new Error(ERROR_PRODUCT_NOT_EXISTED);
        }

        if (moment(mfg).isAfter(moment(handedOverTime))) throw new Error(ERROR_MFG_IS_AFTER_HANDED_OVER_TIME);

        await product.update(
            removeEmptyFields({
                name,
                project_id: projectId,
                productionBatches_id: productionBatchesId,
                type,
                serial,
                version,
                status,
                mfg,
                handed_over_time: handedOverTime,
                customer_id: customerId,
                warranty_status: warrantyStatus,
            })
        );

        res.send({ result: "success" });
    } catch (error) {
        next(error);
    }
}

export async function deleteProduct(req, res, next) {
    try {
        const { productIds } = req.body;

        if (!_.isArray(productIds)) throw new Error(ERROR_INVALID_PARAMETERS);

        let deleteCount = await Product.destroy({
            where: { id: { [Op.in]: productIds } },
        });

        res.send({ result: "success", deleteCount });
    } catch (error) {
        next(error);
    }
}

export async function getProductDetail(req, res, next) {
    try {
        const { id } = req.params;

        const [product, events, issues] = await Promise.all([
            Product.findOne({
                where: { id: id },
                include: [{ model: Project }, { model: Customer }],
            }),
            Event.findAll({
                where: { product_id: id },
                order: [["id", "ASC"]],
                include: {
                    model: Account,
                    attributes: ["email", "name", "avatar", "employee_id"],
                },
            }),
            Issue.findAll({
                where: { product_id: id },
                order: [["id", "DESC"]],
            }),
        ]);

        if (!product) throw new Error(ERROR_PRODUCT_NOT_EXISTED);

        res.send({ result: "success", product, events, issues });
    } catch (error) {
        next(error);
    }
}

export async function exportFileAll(req, res, next) {
    try {
        const { projectId } = req.query;

        let productIds = [];

        const products = await Product.findAll({
            where: { project_id: projectId ?? "" },
            attributes: ["id"],
        });

        productIds = products.map((product) => product.id);

        const components = await Component.findAll({
            where: { product_id: { [Op.in]: productIds }, level: 1 },
            order: [["product_id", "DESC"]],
            attributes: { exclude: ["temporarily_use", "category"] },
            include: [
                {
                    model: Product,
                    as: "product",
                    attributes: ["name"],
                    include: {
                        model: Customer,
                        attributes: ["military_region", "name"],
                        as: "customer",
                    },
                },
                {
                    model: Component,
                    as: "children",
                    attributes: { exclude: ["temporarily_use", "category"] },
                    include: [
                        {
                            model: Component,
                            as: "children",
                            attributes: { exclude: ["temporarily_use", "category"] },
                            include: {
                                model: Product,
                                as: "product",
                                attributes: ["name"],
                                include: {
                                    model: Customer,
                                    attributes: ["military_region", "name"],
                                    as: "customer",
                                },
                            },
                        },
                        {
                            model: Product,
                            as: "product",
                            attributes: ["name"],
                            include: {
                                model: Customer,
                                attributes: ["military_region", "name"],
                                as: "customer",
                            },
                        },
                    ],
                },
            ],
        });

        res.send({ result: "success", components });
    } catch (error) {
        next(error);
    }
}

// Hàm tìm tất cả con cháu của một component
async function findDescendants(parentId) {
    let descendants = [];
    let queue = [parentId]; // Dùng queue để tìm đệ quy

    while (queue.length > 0) {
        const currentId = queue.shift(); // Lấy phần tử đầu tiên
        const children = await Component.findAll({
            where: { parent_id: currentId },
        });

        if (children.length > 0) {
            queue.push(...children.map((child) => child.id)); // Thêm con vào hàng đợi
            descendants.push(...children); // Lưu con vào danh sách kết quả
        }
    }

    return descendants;
}

// Controller xử lý cập nhật serial
export async function updateSerialForDescendants(req, res, next) {
    try {
        const { id } = req.body;

        // Lấy component gốc
        const parentComponent = await Component.findByPk(id);
        if (!parentComponent) {
            return res.status(404).json({ message: "Component không tồn tại!" });
        }

        // Lấy tất cả con cháu
        const descendants = await findDescendants(id);
        if (descendants.length === 0) {
            return res.json({ message: "Không có component con nào để cập nhật!" });
        }

        // Cập nhật serial cho tất cả con cháu
        await Component.update(
            { serial: parentComponent.serial }, // Gán serial của cha
            { where: { id: descendants.map((d) => d.id) } }
        );

        return res.json({
            message: "Cập nhật thành công!",
            updated: descendants.length,
        });
    } catch (error) {
        next(error);
    }
}
