import _ from "lodash";
import moment from "moment";
import { Op, QueryTypes, Sequelize } from "sequelize";
import * as XLSX from "xlsx";
import { Account } from "../models/account.model.js";
import { Component } from "../models/component.model.js";
import { Customer } from "../models/customer.model.js";
import { Event } from "../models/event.model.js";
import { Issue } from "../models/issue.model.js";
import { Product } from "../models/product.model.js";
import { Project } from "../models/project.model.js";
import { errorLevels, scopeOfImpacts, urgencyLevels } from "../shared/constants/constant.js";
import {
    ERROR_EMPTY_COMPLETION_TIME,
    ERROR_INVALID_PARAMETERS,
    ERROR_INVALID_STOP_FIGHTING_DAY,
    ERROR_ISSUE_NOT_EXISTED,
    ERROR_PRODUCTION_ERROR_NOT_EXISTED,
} from "../shared/errors/error.js";
import { isValidNumber, normalizeString, removeEmptyFields } from "../shared/utils/utils.js";
import { database } from "../configs/sequelize.config.js";

export async function createIssue(req, res, next) {
    try {
        const {
            componentId,
            customerId,
            productId,
            accountId,
            projectId,
            receptionTime,
            completionTime,
            handlingTime,
            description,
            severity,
            status,
            type,
            level,
            responsibleHandlingUnit,
            reportingPerson,
            remainStatus,
            overdueKpi,
            warrantyStatus,
            overdueKpiReason,
            impact,
            stopFighting,
            unhandleReason,
            letterSendVmc,
            date,
            materialStatus,
            handlingPlan,
            errorAlert,
            responsibleType,
            kpiH,
            handlingMeasures,
            repairPart,
            repairPartCount,
            unit,
            expDate,
            productStatus,
            note,
            price,
            unitPrice,
            reason,
            responsibleTypeDescription,
            unhandleReasonDescription,
            productCount,
            stopFightingDays,
            scopeOfImpact,
            impactPoint,
            urgencyLevel,
            urgencyPoint,
        } = req.body;

        if (stopFighting && parseInt(stopFightingDays) < 1) throw new Error(ERROR_INVALID_STOP_FIGHTING_DAY);
        if (status === "DELIVERED" && !completionTime) throw new Error(ERROR_EMPTY_COMPLETION_TIME);

        const newIssue = await Issue.create(
            removeEmptyFields({
                component_id: componentId,
                customer_id: customerId,
                product_id: productId,
                account_id: accountId,
                project_id: projectId,
                reception_time: receptionTime ?? moment(),
                completion_time: completionTime,
                handling_time: handlingTime,
                description,
                severity,
                status,
                type,
                level,
                responsible_handling_unit: responsibleHandlingUnit,
                reporting_person: reportingPerson,
                remain_status: remainStatus ? remainStatus : status === "PROCESSED" ? "DONE" : "REMAIN",
                overdue_kpi: overdueKpi,
                warranty_status: warrantyStatus,
                overdue_kpi_reason: overdueKpiReason,
                impact,
                stop_fighting: stopFighting,
                stop_fighting_days: stopFightingDays,
                unhandle_reason: unhandleReason,
                letter_send_vmc: letterSendVmc,
                date,
                material_status: materialStatus,
                handling_plan: handlingPlan,
                error_alert: errorAlert,
                responsible_type: responsibleType,
                kpi_h: kpiH,
                handling_measures: handlingMeasures,
                repair_part: repairPart,
                repair_part_count: repairPartCount,
                unit,
                exp_date: expDate,
                product_status: productStatus,
                note,
                price,
                unit_price: unitPrice,
                reason,
                responsible_type_description: responsibleTypeDescription,
                unhandle_reason_description: unhandleReasonDescription,
                product_count: productCount,
                scope_of_impact: scopeOfImpact,
                impact_point: impactPoint,
                urgency_level: urgencyLevel,
                urgency_point: urgencyPoint,
            })
        );

        const component = await Component.findOne({ where: { id: componentId } });

        const processIssueCount = await Issue.count({
            where: { status: { [Op.ne]: "PROCESSED" }, component_id: componentId },
        });

        if (!!component) {
            if (processIssueCount == 0) {
                await component.update({ temporarily_use: "NO", situation: "GOOD" });
            } else {
                if (component?.temporarily_use == "NO") {
                    await component.update({ situation: "DEFECTIVE" });
                }
            }

            await updateProductSituation(component.toJSON().product_id);
        }

        res.send({ result: "success", issue: newIssue });
    } catch (error) {
        next(error);
    }
}

// export async function getListIssue(req, res, next) {
//     try {
//         let {
//             stopFighting,
//             q,
//             page,
//             limit,
//             status,
//             projectId,
//             productId,
//             accountId,
//             remainStatus,
//             warrantyStatus,
//             unhandleReason,
//             responsibleType,
//             customerId,
//             componentId,
//             type,
//             level,
//             startTime,
//             endTime,
//         } = req.query;

//         if (!!stopFighting !== "" && stopFighting !== undefined) {
//             switch (stopFighting) {
//                 case "true":
//                     stopFighting = true;
//                     break;

//                 case "false":
//                     stopFighting = false;
//                     break;

//                 default:
//                     break;
//             }
//         }

//         startTime = startTime ? moment(startTime, "YYYY-MM-DD").startOf("day").format("YYYY-MM-DD HH:mm:ss") : "";
//         endTime = endTime ? moment(endTime, "YYYY-MM-DD").endOf("day").format("YYYY-MM-DD HH:mm:ss") : "";

//         q = q ?? "";

//         // let projectIds = [];

//         // if (req.account.role === "USER") {
//         //     const userProjects = await Project.findAll({
//         //         where: { project_pm: req.account.email },
//         //         attributes: ["id"],
//         //     });

//         //     projectIds = userProjects.map((project) => project.id);
//         // }

//         const conditions = {
//             [Op.and]: [
//                 !!status ? { status } : undefined,
//                 !!type ? { type } : undefined,
//                 !!remainStatus ? { remain_status: remainStatus } : undefined,
//                 !!warrantyStatus ? { warranty_status: warrantyStatus } : undefined,
//                 !!unhandleReason ? { unhandle_reason: unhandleReason } : undefined,
//                 !!responsibleType ? { responsible_type: responsibleType } : undefined,
//                 !!projectId ? { project_id: projectId } : undefined,
//                 !!productId ? { product_id: productId } : undefined,
//                 !!accountId ? { account_id: accountId } : undefined,
//                 !!customerId ? { customer_id: customerId } : undefined,
//                 !!componentId ? { component_id: componentId } : undefined,
//                 !!stopFighting !== "" && stopFighting !== undefined && stopFighting !== ""
//                     ? { stop_fighting: stopFighting }
//                     : undefined,
//                 !!level ? { level: level } : undefined,
//                 !!startTime && !!endTime
//                     ? {
//                           reception_time: { [Op.between]: [startTime, endTime] },
//                       }
//                     : undefined,
//             ].filter(Boolean),
//         };

//         let issues;

//         const componentCondition = q
//             ? {
//                   [Op.or]: {
//                       serial: {
//                           [Op.like]: `%${q}%`, // Use Op.like for partial matching
//                       },
//                   },
//               }
//             : undefined;

//         const productCondition = q
//             ? {
//                   [Op.or]: {
//                       serial: {
//                           [Op.like]: `%${q}%`, // Use Op.like for partial matching in Product
//                       },
//                   },
//               }
//             : undefined;

//         if (!isValidNumber(limit) || !isValidNumber(page)) {
//             issues = await Issue.findAndCountAll({
//                 where: conditions,
//                 order: [["id", "DESC"]],
//                 include: [
//                     {
//                         model: Account,
//                         attributes: ["email", "name", "avatar", "employee_id"],
//                     },
//                     { model: Project },
//                     {
//                         model: Product,
//                         // where: productCondition,
//                     },
//                     { model: Component, where: componentCondition },
//                 ],
//             });
//         } else {
//             limit = _.toNumber(limit);
//             page = _.toNumber(page);

//             issues = await Issue.findAndCountAll({
//                 where: conditions,
//                 limit,
//                 offset: limit * page,
//                 order: [["id", "DESC"]],
//                 include: [
//                     {
//                         model: Account,
//                         attributes: ["email", "name", "avatar", "employee_id"],
//                     },
//                     { model: Project },
//                     {
//                         model: Product,
//                         // where: productCondition,
//                     },
//                     {
//                         model: Component,
//                         where: componentCondition,
//                     },
//                 ],
//             });
//         }

//         // Add component path for each issue
//         for (const [index, issue] of issues.rows.entries()) {
//             if (issue.component) {
//                 issue.dataValues.componentPath = await issue.component.getComponentPath();
//             }

//             // Calculate order number
//             issue.dataValues.orderNumber = index + 1 + (isValidNumber(limit) ? limit * page : 0);
//         }

//         res.send({
//             result: "success",
//             page,
//             total: issues.count,
//             count: issues.rows.length,
//             issues: issues.rows,
//         });
//     } catch (error) {
//         next(error);
//     }
// }

export async function getListIssue(req, res, next) {
    try {
        let {
            stopFighting,
            q,
            page,
            limit,
            status,
            projectId,
            productId,
            accountId,
            remainStatus,
            warrantyStatus,
            unhandleReason,
            responsibleType,
            customerId,
            componentId,
            type,
            level,
            startTime,
            endTime,
        } = req.query;

        if (!!stopFighting !== "" && stopFighting !== undefined) {
            stopFighting = stopFighting === "true";
        }

        startTime = startTime ? moment(startTime, "YYYY-MM-DD").startOf("day").format("YYYY-MM-DD HH:mm:ss") : "";
        endTime = endTime ? moment(endTime, "YYYY-MM-DD").endOf("day").format("YYYY-MM-DD HH:mm:ss") : "";

        q = q ?? "";

        // Nếu có componentId, tìm tất cả component_id liên quan
        let componentIdList = [];
        if (componentId) {
            const componentQuery = `
                WITH RECURSIVE component_tree AS (
                    SELECT id FROM components WHERE id = :componentId
                    UNION ALL
                    SELECT c.id FROM components c
                    INNER JOIN component_tree ct ON c.parent_id = ct.id
                )
                SELECT id FROM component_tree;
            `;

            const componentResults = await database.query(componentQuery, {
                type: QueryTypes.SELECT,
                replacements: { componentId },
            });

            componentIdList = componentResults.map((c) => c.id);
        }

        const conditions = {
            [Op.and]: [
                !!status ? { status } : undefined,
                !!type ? { type } : undefined,
                !!remainStatus ? { remain_status: remainStatus } : undefined,
                !!warrantyStatus ? { warranty_status: warrantyStatus } : undefined,
                !!unhandleReason ? { unhandle_reason: unhandleReason } : undefined,
                !!responsibleType ? { responsible_type: responsibleType } : undefined,
                !!projectId ? { project_id: projectId } : undefined,
                !!productId ? { product_id: productId } : undefined,
                !!accountId ? { account_id: accountId } : undefined,
                !!customerId ? { customer_id: customerId } : undefined,
                !!componentId && componentIdList.length > 0
                    ? { component_id: { [Op.in]: componentIdList } }
                    : undefined,
                !!stopFighting !== "" && stopFighting !== undefined ? { stop_fighting: stopFighting } : undefined,
                !!level ? { level: level } : undefined,
                !!startTime && !!endTime
                    ? {
                          reception_time: { [Op.between]: [startTime, endTime] },
                      }
                    : undefined,
            ].filter(Boolean),
        };

        const componentCondition = q
            ? {
                  [Op.or]: {
                      serial: {
                          [Op.like]: `%${q}%`,
                      },
                  },
              }
            : undefined;

        const productCondition = q
            ? {
                  [Op.or]: {
                      serial: {
                          [Op.like]: `%${q}%`,
                      },
                  },
              }
            : undefined;

        limit = isValidNumber(limit) ? _.toNumber(limit) : null;
        page = isValidNumber(page) ? _.toNumber(page) : null;

        let findOptions = {
            where: conditions,
            order: [["id", "DESC"]],
            include: [
                {
                    model: Account,
                    attributes: ["email", "name", "avatar", "employee_id"],
                },
                { model: Project },
                {
                    model: Product,
                },
                {
                    model: Component,
                    where: componentCondition,
                },
            ],
        };

        if (limit && page !== null) {
            findOptions.limit = limit;
            findOptions.offset = limit * page;
        }

        const issues = await Issue.findAndCountAll(findOptions);

        // Thêm componentPath và orderNumber
        for (const [index, issue] of issues.rows.entries()) {
            if (issue.component) {
                issue.dataValues.componentPath = await issue.component.getComponentPath();
            }

            issue.dataValues.orderNumber = index + 1 + (limit ? limit * page : 0);
        }

        res.send({
            result: "success",
            page,
            total: issues.count,
            count: issues.rows.length,
            issues: issues.rows,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateIssue(req, res, next) {
    const {
        temporarilyUse,
        id,
        componentId,
        customerId,
        productId,
        accountId,
        projectId,
        receptionTime,
        completionTime,
        handlingTime,
        description,
        severity,
        status,
        type,
        level,
        responsibleHandlingUnit,
        reportingPerson,
        remainStatus,
        overdueKpi,
        warrantyStatus,
        overdueKpiReason,
        impact,
        stopFighting,
        unhandleReason,
        letterSendVmc,
        date,
        materialStatus,
        handlingPlan,
        errorAlert,
        responsibleType,
        kpiH,
        handlingMeasures,
        repairPart,
        repairPartCount,
        unit,
        expDate,
        productStatus,
        note,
        price,
        unitPrice,
        reason,
        responsibleTypeDescription,
        unhandleReasonDescription,
        productCount,
        stopFightingDays,
        scopeOfImpact,
        impactPoint,
        urgencyLevel,
        urgencyPoint,
    } = req.body;

    try {
        let issue = await Issue.findOne({
            where: { id: id },
        });

        if (!issue?.toJSON()) {
            throw new Error(ERROR_PRODUCTION_ERROR_NOT_EXISTED);
        }

        if (stopFighting && parseInt(stopFightingDays) < 1) throw new Error(ERROR_INVALID_STOP_FIGHTING_DAY);

        if (status === "DELIVERED" && !completionTime) throw new Error(ERROR_EMPTY_COMPLETION_TIME);

        await issue.update(
            removeEmptyFields({
                temporarily_use: temporarilyUse,
                component_id: componentId,
                customer_id: customerId,
                product_id: productId,
                account_id: accountId,
                project_id: projectId,
                reception_time: receptionTime,
                completion_time: completionTime,
                handling_time: handlingTime,
                description,
                severity,
                status,
                type,
                level,
                responsible_handling_unit: responsibleHandlingUnit,
                reporting_person: reportingPerson,
                remain_status: remainStatus,
                overdue_kpi: overdueKpi,
                warranty_status: warrantyStatus,
                overdue_kpi_reason: overdueKpiReason,
                impact,
                stop_fighting: stopFighting,
                stop_fighting_days: stopFightingDays,
                unhandle_reason: unhandleReason,
                letter_send_vmc: letterSendVmc,
                date,
                material_status: materialStatus,
                handling_plan: handlingPlan,
                error_alert: errorAlert,
                responsible_type: responsibleType,
                kpi_h: kpiH,
                handling_measures: handlingMeasures,
                repair_part: repairPart,
                repair_part_count: repairPartCount,
                unit,
                exp_date: expDate,
                product_status: productStatus,
                note,
                price,
                unit_price: unitPrice,
                reason,
                responsible_type_description: responsibleTypeDescription,
                unhandle_reason_description: unhandleReasonDescription,
                product_count: productCount,
                scope_of_impact: scopeOfImpact,
                impact_point: impactPoint,
                urgency_level: urgencyLevel,
                urgency_point: urgencyPoint,
            })
        );

        const component = await Component.findOne({ where: { id: componentId } });

        const processIssueCount = await Issue.count({
            where: { status: { [Op.ne]: "PROCESSED" }, component_id: componentId },
        });

        if (processIssueCount == 0) {
            await component.update({ temporarily_use: "NO", situation: "GOOD" });
        } else {
            if (component?.temporarily_use == "NO") {
                await component.update({ situation: "DEFECTIVE" });
            }
        }

        await updateProductSituation(component.toJSON().product_id);

        res.send({ result: "success" });
    } catch (error) {
        next(error);
    }
}

export async function deleteIssue(req, res, next) {
    try {
        const { issueIds } = req.body;

        if (!_.isArray(issueIds)) throw new Error(ERROR_INVALID_PARAMETERS);

        const issues = await Issue.findAll({
            where: { id: { [Op.in]: issueIds } },
            include: { model: Component, as: "component" },
        });

        const components = issues.map((item) => item?.component);

        let deleteCount = await Issue.destroy({
            where: { id: { [Op.in]: issueIds } },
        });

        for (const component of components) {
            if (!component) continue; // Skip if the component is not found

            const processIssueCount = await Issue.count({
                where: {
                    status: { [Op.ne]: "PROCESSED" },
                    component_id: component?.id,
                },
            });

            if (processIssueCount === 0) {
                await Component.update({ temporarily_use: "NO", situation: "GOOD" }, { where: { id: component?.id } });
            } else {
                if (component.temporarily_use === "NO") {
                    await Component.update({ situation: "DEFECTIVE" }, { where: { id: component?.id } });
                }
            }

            updateProductSituation(component.toJSON().product_id);
        }

        res.send({ result: "success", deleteCount });
    } catch (error) {
        next(error);
    }
}

// export async function uploadExcelFile(req, res, next) {
//     try {
//         const { projectId } = req.body;
//         const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
//         const sheetName = workbook.SheetNames[0];
//         const sheet = workbook.Sheets[sheetName];
//         const jsonData = XLSX.utils.sheet_to_json(sheet);

//         let newCustomers = [];

//         for (const item of jsonData) {
//             if (!item["STT"]) continue;

//             const customerName = item["Đơn vị/Tên khách hàng"];

//             if (!newCustomers.find((cs) => cs?.name?.toLowerCase() === customerName?.toLowerCase())) {
//                 const newCustomer = await Customer.create(
//                     removeEmptyFields({
//                         name: customerName,
//                         military_region: customerName,
//                         sign: customerName,
//                     })
//                 );

//                 newCustomers = [...newCustomers, newCustomer.toJSON()];
//             }

//             const customer = newCustomers.find((cs) => cs?.name?.toLowerCase() == customerName?.toLowerCase());

//             const productSerials = !!item["No S/N"] ? item["No S/N"]?.split("\r\n") : [""];

//             let newProducts = [];
//             for (const prod of productSerials) {
//                 const newProduct = await Product.create(
//                     removeEmptyFields({
//                         serial: prod,
//                         name: item["Bộ phận lỗi"],
//                         project_id: projectId,
//                         customer_id: customer?.id,
//                         type: "HAND_OVER",
//                     })
//                 );

//                 await Event.create(
//                     removeEmptyFields({
//                         account_id: req.email,
//                         project_id: projectId,
//                         product_id: newProduct.toJSON()?.id,
//                         type: "PRODUCT",
//                         sub_type: "CREATE",
//                         content: "Thêm mới sản phẩm",
//                     })
//                 );

//                 newProducts = [...newProducts, newProduct.toJSON()];
//             }
//             // }
//             for (const prod of newProducts) {
//                 const scopeOfImpact = scopeOfImpacts.find(
//                     (sc) => normalizeString(sc.value) === normalizeString(item?.["Phạm vi ảnh hưởng"])
//                 )?.name;
//                 const level = errorLevels.find(
//                     (el) => normalizeString(el.value) === normalizeString(item?.["Mức độ ảnh hưởng"])
//                 );
//                 const urgencyLevel = urgencyLevels.find(
//                     (ul) => normalizeString(ul.value) === normalizeString(item?.["Mức độ cấp thiết"])
//                 );

//                 const newIssue = await Issue.create(
//                     removeEmptyFields({
//                         product_id: prod?.id,
//                         project_id: projectId,
//                         product_count: newProducts.length > 1 ? 1 : item["Số lượng"],
//                         customer_id: customer?.id,
//                         reception_time: item["Ngày tiếp nhận"] ?? "",
//                         completion_time: item["Ngày hoàn thành"] ?? "",
//                         description: item["Hiện trạng lỗi xác nhận ở đơn vị"] ?? "",
//                         reason: item["Nguyên nhân lỗi"],
//                         responsible_type:
//                             item["Phân loại trách nhiệm/vật tư lỗi"] === "Chưa xác định" ? "UNKNOWN" : "MATERIAL",
//                         responsible_type_description: item["Phân loại trách nhiệm/vật tư lỗi"],
//                         handling_plan: item["Giải pháp sửa chữa"],
//                         responsible_handling_unit: item["Trách nhiệm xử lý lỗi"],
//                         unhandle_reason_description: item["Hiện trạng xử lý/ Lý do nếu chưa xử lý xong"],
//                         status:
//                             item["Hiện trạng xử lý/ Lý do nếu chưa xử lý xong"] == "Hoàn thành"
//                                 ? "PROCESSED"
//                                 : "PROCESSING",
//                         unit_price: item["Đơn giá xử lý"],
//                         price: item["Thành tiền"],
//                         note: item["Ghi chú"],
//                         level: level?.name,
//                         impact_point: level?.score,
//                         reception_time: moment().format("YYYY-MM-DD"),
//                         scope_of_impact: scopeOfImpact,
//                         urgency_level: urgencyLevel?.name,
//                         urgency_point: urgencyLevel?.score,
//                     })
//                 );

//                 await Event.create(
//                     removeEmptyFields({
//                         account_id: req.email,
//                         project_id: projectId,
//                         issue_id: newIssue.toJSON()?.id,
//                         type: "ISSUE",
//                         sub_type: "CREATE",
//                         content: "Thêm lỗi mới",
//                     })
//                 );
//             }
//         }

//         res.send({ result: "success" });
//     } catch (error) {
//         next(error);
//     }
// }

export async function getIssueDetail(req, res, next) {
    try {
        const { issueId } = req.params;

        const [issue, events] = await Promise.all([
            Issue.findOne({
                where: { id: issueId },
                include: [
                    {
                        model: Account,
                        attributes: ["email", "name", "avatar", "employee_id"],
                    },
                    { model: Project },
                    { model: Product },
                    { model: Component },
                    { model: Customer },
                ],
            }),
            Event.findAndCountAll({
                where: { issue_id: issueId },
                order: [["id", "ASC"]],
                include: {
                    model: Account,
                    attributes: ["email", "name", "avatar", "employee_id"],
                },
            }),
        ]);

        if (!issue) throw new Error(ERROR_ISSUE_NOT_EXISTED);

        res.send({ result: "success", issue, events });
    } catch (error) {
        next(error);
    }
}

export async function getListOfReason(req, res, next) {
    try {
        const { projectId } = req.query;

        // Get the latest `id` for each `reason`
        const latestIds = await Issue.findAll({
            where: {
                project_id: projectId,
                reason: { [Op.ne]: null },
            },
            attributes: [[Sequelize.fn("MAX", Sequelize.col("id")), "id"]],
            group: ["reason"],
            raw: true,
        });

        const latestIdsArray = latestIds.map((record) => record.id);

        // Retrieve full records for each latest `id`
        const reasons = await Issue.findAll({
            where: {
                id: { [Op.in]: latestIdsArray },
            },
            attributes: [
                "reason",
                "responsible_type",
                "level",
                "overdue_kpi_reason",
                "impact",
                "stop_fighting",
                "unhandle_reason",
                "handling_measures",
                "scope_of_impact",
                "impact_point",
                "urgency_level",
                "urgency_point",
            ],
            order: [["id", "DESC"]],
        });

        res.send({ result: "success", total: reasons.length, reasons });
    } catch (error) {
        next(error);
    }
}

// export async function swapHandlingMeasureAndHandlingPlan(req, res, next) {
//     const { projectId } = req.body;
//     const allowedMeasures = [
//         "REPLACE_DEVICE",
//         "REPAIR",
//         "REPLACE_OR_REPAIR",
//         "PRESERVE",
//         "CALIBRATE",
//         "UPDATE_FW_SW",
//         "UPDATE_XLTT_SOFTWARE",
//         "UPDATE_XLTH_SOFTWARE",
//         "RE_SOLDER_HIGH_FREQUENCY_CABLE",
//         "CHECK_SYSTEM_AGAIN",
//     ];

//     const transaction = await Issue.sequelize.transaction();
//     // Start a transaction
//     try {
//         const issues = await Issue.findAll({ where: { project_id: projectId } });

//         for (const issue of issues) {
//             // Swap only if handling_measure is not in the allowed list
//             if (!allowedMeasures.includes(issue.handling_measures)) {
//                 // Swap the values
//                 const updatedFields = {
//                     handling_plan: issue.handling_measures,
//                     handling_measures: issue.handling_plan,
//                 };

//                 // Update the record in the database
//                 await issue.update(updatedFields, { transaction });
//             }
//         }

//         // Commit the transaction
//         await transaction.commit();
//         res.send({ result: "success" });
//     } catch (error) {
//         if (transaction) await transaction.rollback();
//         next(error);
//     }
// }

export async function createSituation(req, res, next) {
    try {
        const products = await Product.findAll({
            attributes: ["id"],
            include: {
                model: Issue,
                as: "issues",
                attributes: ["status", "stop_fighting"],
            },
        });

        const updatedProduct = products.map((product) => {
            const issues = product.issues;

            let active = "GOOD";

            if (issues?.length > 0) {
                const allProcessed = issues.every((item) => item?.status == "PROCESSED");
                if (!allProcessed) {
                    const hasStopFighting = issues.some((item) => item?.stop_fighting && item?.status != "PROCESSED");
                    active = hasStopFighting ? "DEFECTIVE" : "DEGRADED";
                }
            }
            return { id: product?.id, issues, situation: active };
        });

        await Promise.all(
            updatedProduct.map(async (product) => {
                await Product.update({ situation: product.situation }, { where: { id: product.id } });
            })
        );

        const components = await Component.findAll({
            attributes: ["id"],
            include: {
                model: Issue,
                as: "issues",
                attributes: ["status", "stop_fighting"],
            },
        });

        const updatedComponent = components.map((component) => {
            const issues = component.issues;

            let active = "GOOD";

            if (issues?.length > 0) {
                const allProcessed = issues.every((item) => item?.status == "PROCESSED");
                if (!allProcessed) {
                    const hasStopFighting = issues.some((item) => item?.stop_fighting && item?.status != "PROCESSED");
                    active = hasStopFighting ? "DEFECTIVE" : "DEGRADED";
                }
            }
            return { id: component?.id, issues, situation: active };
        });

        await Promise.all(
            updatedComponent.map(async (component) => {
                await Component.update({ situation: component.situation }, { where: { id: component.id } });
            })
        );

        res.send({ result: "success" });
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

// export async function readIssueFromFile(req, res, next) {
//     try {
//         const { projectId } = req.body;
//         const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
//         const sheetName = workbook.SheetNames[0];
//         const sheet = workbook.Sheets[sheetName];
//         const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

//         const accountId = req.email;

//         if (jsonData.length < 2) {
//             return res.status(400).json({ error: "Invalid file format" });
//         }

//         const headers = jsonData[1]; // Lấy tiêu đề cột từ dòng đầu tiên
//         const issues = jsonData.slice(2).map((row) => {
//             let obj = {};
//             headers.forEach((header, index) => {
//                 obj[header || `Column_${index}`] = row[index] || null;
//             });
//             return obj;
//         });

//         const data = [];

//         const customerMapping = {
//             tt95: "VELINT18TT95",
//             qk2: "VELINT18QK2",
//             qk4: "VELINT18QK4",
//             qk7: "VELINT18QK7",
//             qđ3: "VELINT18QD3",
//         };

//         const serialMapping = {
//             KB6270: "SRS1620109",
//             KB6267: "SRS1620110",
//             KB6264: "SRS1620112",
//             KB6271: "CRS1620102",
//             KB6272: "ES1620105",
//             QS419: "SRS1620101",
//             QS420: "SRS1620102",
//             QS425: "SRS1620103",
//             QS424: "CRS1620101",
//             QS450: "ES1620101",

//             KD8349: "SRS1620107",
//             KD8347: "SRS1620108",
//             KD8345: "SRS1620111",
//             KD8348: "CRS1620105",
//             KD8346: "ES1620104",

//             AC5461: "SRS1620104",
//             AC5459: "SRS1620105",
//             AC5460: "SRS1620106",
//             AC5458: "CRS1620104",
//             AC5457: "ES1620102",

//             QS446: "SRS1620113",
//             QS437: "SRS1620114",
//             QS443: "SRS1620115",
//             QS421: "CRS1620103",
//             QS449: "ES1620103",
//         };

//         for (const issue of issues) {
//             const [component, product] = await Promise.all([
//                 (async () => {
//                     let comp = await Component.findOne({
//                         where: {
//                             serial: issue["[[S/N]]"],
//                             name: issue["Cấp 3"],
//                         },
//                     });

//                     if (!comp) {
//                         comp = await Component.findOne({
//                             where: {
//                                 serial: issue["[[S/N]]"],
//                                 name: issue["Cấp 2"],
//                             },
//                         });
//                     }

//                     if (!comp && serialMapping[issue["[[S/N]]"]]) {
//                         comp = await Component.findOne({
//                             where: {
//                                 serial: serialMapping[issue["[[S/N]]"]],
//                                 name: issue["Cấp 3"],
//                             },
//                         });

//                         if (!comp) {
//                             comp = await Component.findOne({
//                                 where: {
//                                     serial: serialMapping[issue["[[S/N]]"]],
//                                     name: issue["Cấp 2"],
//                                 },
//                             });
//                         }
//                     }

//                     return comp;
//                 })(),

//                 Product.findOne({
//                     where: {
//                         serial: customerMapping[issue["[[Tram]]"]?.split("-")[0]] ?? "",
//                     },
//                 }),
//             ]);

//             data.push({
//                 item: issue["Cấp 3"],
//                 index: issues.indexOf(issue) + 1,
//                 component: component?.id ?? "empty",
//                 product: product?.id ?? "empty",
//                 customer: product?.customer_id ?? "empty",
//                 date: moment(issue["[[Ngay]]"], "D/M/YYYY").format("YYYY-MM-DD"),
//             });

//             // if (component?.id)
//             //     await Issue.create(
//             //         removeEmptyFields({
//             //             component_id: component.id,
//             //             customer_id: product?.customer_id,
//             //             product_id: product.id,
//             //             account_id: accountId,
//             //             project_id: projectId,
//             //             reception_time: moment(issue["[[Ngay]]"], "D/M/YYYY").format("YYYY-MM-DD"),
//             //             completion_time:
//             //                 moment(issue["Date"], "D/M/YYYY").format("YYYY-MM-DD") == "Invalid date"
//             //                     ? ""
//             //                     : moment(issue["Date"], "D/M/YYYY").format("YYYY-MM-DD"),
//             //             handling_time: issue["Thời gian xử lý/tồn\r\n(giờ)"],
//             //             description: issue["[[Hien_tuong]]"],
//             //             status: issue["Cảnh báo lỗi"] == "Đã xử lý" ? "PROCESSED" : "UNPROCESSED",
//             //             level: "MINOR",
//             //             responsible_handling_unit: issue["Trách nhiệm xử lý"],
//             //             reporting_person: issue["Nhân sự báo lỗi"],
//             //             remain_status: issue["Tồn chưa xử lý"] == "XL xong" ? "DONE" : "REMAIN",
//             //             overdue_kpi: issue["Quá hạn so với KPI"] == "Có" ? true : false,
//             //             warranty_status: issue["Tình trạng bảo hành"] == "còn hạn BH" ? "UNDER" : "OVER",
//             //             overdue_kpi_reason: issue["Lý do quá hạn KPI"],
//             //             impact: issue["Ảnh hưởng SSCĐ"] == "Có" ? "YES" : "NO",
//             //             stop_fighting: issue["Dừng chiến đấu"] == "Có" ? true : false,
//             //             stop_fighting_days: issue["Số ngày dừng chiến đấu"],
//             //             // unhandle_reason: issue["Lý do chưa khắc phục"],
//             //             letter_send_vmc: issue["Công văn gửi VMC"],
//             //             // date,
//             //             material_status: issue["Tình trạng vật tư"],
//             //             handling_plan: issue["[[Phuong_An_Xu_Ly]]"],
//             //             // error_alert: errorAlert,
//             //             // responsible_type: responsibleType,
//             //             kpi_h: issue["[[KPI_h]]\r\n"],
//             //             // handling_measures: handlingMeasures,
//             //             repair_part: issue["[[Linh_Kien_Thay_The_Sua_Chua]]"],
//             //             repair_part_count: issue["[[SL]]"],
//             //             unit: issue["[[DVT]]"],
//             //             // exp_date: expDate,
//             //             product_status: "DELIVERED",
//             //             // note,
//             //             // price,
//             //             // unit_price: unitPrice,
//             //             // reason,
//             //             // responsible_type_description: responsibleTypeDescription,
//             //             // unhandle_reason_description: unhandleReasonDescription,
//             //             // product_count: productCount,
//             //             // scope_of_impact: scopeOfImpact,
//             //             // impact_point: impactPoint,
//             //             // urgency_level: urgencyLevel,
//             //             // urgency_point: urgencyPoint,
//             //         })
//             //     );
//         }

//         res.json(data);
//     } catch (error) {
//         next(error);
//     }
// }
