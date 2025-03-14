import _ from "lodash";
import { Op, QueryTypes, Sequelize } from "sequelize";
import { database } from "../configs/sequelize.config.js";
import { Account } from "../models/account.model.js";
import { Component } from "../models/component.model.js";
import { Customer } from "../models/customer.model.js";
import { Event } from "../models/event.model.js";
import { Issue } from "../models/issue.model.js";
import { Product } from "../models/product.model.js";
import {
    ERROR_COMPONENT_NOT_EXISTED,
    ERROR_COMPONENT_PARENT_IS_REQUIRED,
    ERROR_INVALID_COMPONENT_LEVEL,
    ERROR_INVALID_PARAMETERS,
    ERROR_MAX_COMPONENT_LEVEL,
    ERROR_PRODUCT_IS_REQUIRED,
} from "../shared/errors/error.js";
import { getIssuesByComponent } from "../shared/utils/database.util.js";
import { isValidNumber, removeEmptyFields } from "../shared/utils/utils.js";

export async function createComponent(req, res, next) {
    try {
        const {
            temporarilyUse,
            parentId,
            productId,
            type,
            serial,
            description,
            category,
            level,
            name,
            version,
            status,
        } = req.body;

        // const component = await Component.findOne({ where: { serial: serial } });

        // if (
        //   !!component &&
        //   normalizeString(component.toJSON()?.serial) != "thieuserial"
        // )
        //   throw new Error(ERROR_COMPONENT_EXISTED);

        if (Number(level) > 4) throw new Error(ERROR_MAX_COMPONENT_LEVEL);

        if (Number(level) < 1) throw new Error(ERROR_INVALID_COMPONENT_LEVEL);

        if (Number(level) > 1 && !parentId) throw new Error(ERROR_COMPONENT_PARENT_IS_REQUIRED);

        if (Number(level) == 1 && !productId) throw new Error(ERROR_PRODUCT_IS_REQUIRED);

        const newComponentData = removeEmptyFields({
            parent_id: parentId,
            product_id: productId,
            type,
            serial,
            description,
            category,
            level,
            name,
            version,
            status: status || (temporarilyUse === "YES" ? "DEGRADED" : ""),
            temporarily_use: temporarilyUse,
            situation: temporarilyUse == "YES" ? "DEGRADED" : "GOOD",
        });

        const promises = [Component.create(newComponentData)];

        const [newComponent] = await Promise.all(promises);

        await updateProductSituation(productId);

        res.send({ result: "success", component: newComponent });
    } catch (error) {
        next(error);
    }
}

export async function getListComponent(req, res, next) {
    try {
        let { q, page, limit, type, level, parentId, productId, projectId, status, customerId, situation } = req.query;

        q = q ?? "";

        let productIds = [];

        // Lấy danh sách product_id dựa vào projectId (nếu có)
        const products = await Product.findAll({
            where: { project_id: projectId ?? "" },
            attributes: ["id"],
        });

        productIds = products.map((product) => product.id);

        // Điều kiện lọc components
        const conditions = {
            [Op.or]: [
                { serial: { [Op.like]: `%${q}%` } },
                { name: { [Op.like]: `%${q}%` } },
                { version: { [Op.like]: `%${q}%` } },
            ],
            [Op.and]: [
                !!type ? { type } : undefined,
                !!productId ? { product_id: productId } : undefined,
                !!parentId ? { parent_id: parentId } : undefined,
                !!level ? { level } : undefined,
                !!status ? { status } : undefined,
                !productId ? { product_id: { [Op.in]: productIds } } : undefined,
                // Chỉ lấy components có issue UNPROCESSED nếu situation = DEFECTIVE
                situation === "DEFECTIVE"
                    ? {
                          id: {
                              [Op.in]: Sequelize.literal(
                                  `(SELECT component_id FROM issues WHERE issues.status = 'UNPROCESSED' OR issues.status = "PROCESSING")`
                              ),
                          },
                      }
                    : situation === "GOOD"
                    ? {
                          [Op.or]: [
                              // Lấy components không có issue nào
                              {
                                  id: {
                                      [Op.notIn]: Sequelize.literal(`(SELECT DISTINCT component_id FROM issues)`),
                                  },
                              },
                              // Lấy components có tất cả issues đều là "PROCESSED"
                              {
                                  id: {
                                      [Op.notIn]: Sequelize.literal(
                                          `(SELECT DISTINCT component_id FROM issues WHERE issues.status != 'PROCESSED')`
                                      ),
                                  },
                              },
                          ],
                      }
                    : undefined,
            ].filter(Boolean),
        };

        // Điều kiện lọc theo customer_id (nếu có)
        const customerCondition = customerId ? { id: customerId } : undefined;

        // Query components
        const queryOptions = {
            where: conditions,
            order: [["product_id", "DESC"]],
            include: [
                {
                    model: Product,
                    as: "product",
                    attributes: ["name", "serial", "customer_id"],
                    include: {
                        model: Customer,
                        as: "customer",
                        attributes: ["military_region", "name", "id"],
                        where: customerCondition,
                    },
                },
            ],
        };

        // Nếu có phân trang thì thêm limit & offset
        if (isValidNumber(limit) && isValidNumber(page)) {
            limit = _.toNumber(limit);
            page = _.toNumber(page);
            queryOptions.limit = limit;
            queryOptions.offset = limit * page;
        }

        // Thực hiện truy vấn
        const [total, components] = await Promise.all([
            Component.count({ where: conditions }),
            Component.findAndCountAll(queryOptions),
        ]);

        // Đánh số thứ tự orderNumber
        for (const [index, component] of components.rows.entries()) {
            component.dataValues.orderNumber = index + 1 + (isValidNumber(limit) ? limit * page : 0);
            component.dataValues.issues = await getIssuesByComponent(component.id);
        }

        // Trả kết quả
        res.send({
            result: "success",
            page,
            total: total,
            count: components.rows.length,
            components: components.rows,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateComponent(req, res, next) {
    const {
        temporarilyUse,
        componentId,
        parentId,
        productId,
        type,
        serial,
        description,
        category,
        level,
        name,
        version,
        status,
    } = req.body;

    try {
        // const existedComponent = await Component.findOne({
        //   where: { serial: serial },
        // });

        // if (
        //   !!existedComponent &&
        //   normalizeString(existedComponent.toJSON()?.serial) != "thieuserial"
        // )
        //   throw new Error(ERROR_COMPONENT_EXISTED);

        let component = await Component.findOne({
            where: { id: componentId },
        });

        if (!component?.toJSON()) {
            throw new Error(ERROR_COMPONENT_NOT_EXISTED);
        }

        if (Number(level) > 4) throw new Error(ERROR_MAX_COMPONENT_LEVEL);

        if (Number(level) < 1) throw new Error(ERROR_INVALID_COMPONENT_LEVEL);

        if (Number(level) > 1 && !parentId) throw new Error(ERROR_COMPONENT_PARENT_IS_REQUIRED);

        await component.update({
            ...removeEmptyFields({
                parent_id: parentId,
                product_id: productId,
                type,
                serial,
                category,
                level,
                name,
                version,
                status,
                temporarily_use: temporarilyUse,
                situation: temporarilyUse == "YES" ? "DEGRADED" : "GOOD",
            }),
            description,
        });

        if (temporarilyUse == "YES") {
            await Issue.update({ temporarily_use: "YES" }, { where: { component_id: componentId } });
        } else {
            await Issue.update({ temporarily_use: "NO" }, { where: { component_id: componentId } });
            const issueProcessedCount = await Issue.count({
                where: { component_id: componentId, status: { [Op.ne]: "PROCESSED" } },
            });

            if (issueProcessedCount > 0) {
                await Component.update({ situation: "DEFECTIVE" }, { where: { id: componentId } });
            } else {
                await Component.update({ situation: "GOOD" }, { where: { id: componentId } });
            }
        }

        await updateProductSituation(component.toJSON().product_id);

        res.send({ result: "success" });
    } catch (error) {
        next(error);
    }
}

export async function deleteComponent(req, res, next) {
    try {
        const { componentIds } = req.body;

        if (!_.isArray(componentIds)) throw new Error(ERROR_INVALID_PARAMETERS);

        let deleteCount = await Component.destroy({
            where: { id: { [Op.in]: componentIds } },
        });

        res.send({ result: "success", deleteCount });
    } catch (error) {
        next(error);
    }
}

export async function getComponentDetail(req, res, next) {
    try {
        const { id } = req.params;

        const query = `
        WITH RECURSIVE component_tree AS (
            SELECT id FROM components WHERE id = :componentId
            UNION ALL
            SELECT c.id FROM components c
            INNER JOIN component_tree ct ON c.parent_id = ct.id
        )
        SELECT i.*
        FROM issues i
        JOIN component_tree ct ON i.component_id = ct.id;
        `;

        const [component, events, issues] = await Promise.all([
            Component.findOne({
                where: { id: id },
                include: [{ model: Product, include: { model: Customer } }],
            }),
            Event.findAndCountAll({
                where: { component_id: id },
                order: [["id", "ASC"]],
                include: {
                    model: Account,
                    attributes: ["email", "name", "avatar", "employee_id"],
                },
            }),
            database.query(query, {
                type: QueryTypes.SELECT,
                replacements: { componentId: id },
            }),
        ]);

        if (!component) throw new Error(ERROR_COMPONENT_NOT_EXISTED);

        res.send({ result: "success", component, events, issues });
    } catch (error) {
        next(error);
    }
}

async function updateProductSituation(productId) {
    const defectiveComponentCount = await Component.count({
        where: { product_id: productId, situation: "DEFECTIVE" },
    });
    const degradedComponentCount = await Component.count({
        where: { product_id: productId, situation: "DEGRADED" },
    });

    if (defectiveComponentCount > 0) {
        await Product.update({ situation: "DEFECTIVE" }, { where: { id: productId } });

        return;
    }

    if (degradedComponentCount > 0) {
        await Product.update({ situation: "DEGRADED" }, { where: { id: productId } });

        return;
    }

    await Product.update({ situation: "GOOD" }, { where: { id: productId } });
}

// export async function readFromExcel(req, res, next) {
//     try {
//         const { productId, level, parentId } = req.body;
//         const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

//         const excludeCells = new Set([
//             "Mất nguồn",
//             "Không khởi động được",
//             "Không hoạt động",
//             "không có tín hiệu",
//             "Chập chờn",
//             "Nứt",
//             "Vênh",
//             "Tín hiệu quang không thông",
//             "Han rỉ",
//             "Bị vào nước",
//             "Móp méo",
//             "Hỏng khối nguồn",
//             "Cháy",
//             "Đứt dây",
//             "không thông",
//             "Vỡ gá kim",
//             "Quay chậm bất thường",
//             "thủng ống tyo hơi",
//             "nổ máy có tiếng kêu bất thường",
//             "Nứt, phồng vỏ",
//             "Không tích điện",
//             "Không có điện áp nạp bù từ máy phát nạp",
//             "Không có điện áp nạp bù từ điện lưới",
//             "Gẫy cánh",
//             "Dây tín hiệu chập chờn",
//             "Gá đế chân chống điện bị gãy chốt",
//             "Gá đế chân chống cơ bị gãy chốt.",
//             "Bị kẹt",
//         ]);

//         const createComponents = async (components, parentId = null, componentLevel) => {
//             const filteredComponents = components.filter((comp) => !excludeCells.has(comp));
//             const componentData = filteredComponents.map((name) => ({
//                 name,
//                 parent_id: parentId,
//                 product_id: productId,
//                 // serial: "thiếu serial",
//                 type: "HARDWARE",
//                 level: componentLevel,
//                 status: "USING",
//             }));

//             await Component.bulkCreate(componentData, { ignoreDuplicates: true });
//         };

//         const processLevel2 = async () => {
//             const sheetName = workbook.SheetNames[1];
//             const sheet = workbook.Sheets[sheetName];
//             const jsonData = XLSX.utils.sheet_to_json(sheet);

//             const componentNames = [
//                 Object.keys(jsonData[1])[0],
//                 ...jsonData
//                     .filter((item) => item["HT Thu URS - XLTH  "] != "Trạm Xử lý")
//                     .map((item) => item["HT Thu URS - XLTH  "]),
//             ];

//             const componentLevel1 = await Component.findAll({
//                 where: { product_id: productId, level: 1 },
//             });
//             for (const cplv1 of componentLevel1) {
//                 if (cplv1.name != "Trạm Xử lý") await createComponents(componentNames, cplv1.id, 2);
//             }
//         };

//         const processHigherLevels = async (sheetIndex, componentLevel) => {
//             const sheetName = workbook.SheetNames[sheetIndex];
//             const sheet = workbook.Sheets[sheetName];
//             const jsonData = XLSX.utils.sheet_to_json(sheet);

//             const componentsByParent = jsonData.reduce((result, item) => {
//                 for (const [key, value] of Object.entries(item)) {
//                     if (!result[key]) result[key] = [];
//                     result[key].push(value);
//                 }
//                 return result;
//             }, {});

//             for (const [parentName, childComponents] of Object.entries(componentsByParent)) {
//                 const parents = await Component.findAll({
//                     where: { name: parentName, product_id: productId },
//                 });
//                 for (const parent of parents) {
//                     await createComponents(childComponents, parent.id, parentName == "Trạm Xử lý" ? 2 : componentLevel);
//                 }
//             }
//         };

//         switch (parseInt(level, 10)) {
//             case 2:
//                 await processLevel2();
//                 break;
//             case 3:
//                 await processHigherLevels(2, 3);
//                 break;
//             case 4:
//                 await processHigherLevels(3, 4);
//                 break;
//             default:
//                 return res.status(400).send({ error: "Invalid level provided." });
//         }

//         res.send({
//             result: "success",
//         });
//     } catch (error) {
//         next(error);
//     }
// }

// export async function cloneRecord(req, res, next) {
//     try {
//         const { ids, n, parentId } = req.body; // Nhận danh sách ID và số lần nhân bản từ request
//         if (!Array.isArray(ids) || ids.length === 0 || n <= 0) {
//             return res.status(400).json({ error: "Invalid input data" });
//         }

//         // Lấy tất cả bản ghi có trong danh sách ids
//         const records = await Component.findAll({
//             where: { id: ids },
//             raw: true, // Lấy dữ liệu dạng JSON object
//         });

//         if (records.length === 0) {
//             return res.status(404).json({ error: "No records found to clone" });
//         }

//         // Xóa `id` khỏi bản ghi để tránh lỗi trùng khóa chính
//         const newRecords = [];
//         for (let i = 0; i < n; i++) {
//             records.forEach((record) => {
//                 const { id, ...dataWithoutId } = record; // Loại bỏ id
//                 newRecords.push({ ...dataWithoutId, parent_id: parentId });
//             });
//         }

//         // Chèn dữ liệu mới vào database
//         await Component.bulkCreate(newRecords);

//         return res.status(201).json({ message: `Cloned ${records.length * n} records successfully` });
//     } catch (error) {
//         next(error);
//     }
// }

export async function getChildrenById(req, res, next) {
    try {
        const { id } = req.params;

        // Lấy danh sách component con
        const children = await Component.findAll({ where: { parent_id: id } });

        // Lấy danh sách issues cho từng component con
        for (let child of children) {
            child.dataValues.issues = await getIssuesByComponent(child.id);
        }

        res.send({ result: "success", children });
    } catch (error) {
        next(error);
    }
}
