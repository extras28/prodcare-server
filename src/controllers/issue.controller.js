import { Op } from "sequelize";
import { Issue } from "../models/issue.model.js";
import {
  ERROR_EMPTY_COMPLETION_TIME,
  ERROR_INVALID_PARAMETERS,
  ERROR_INVALID_STOP_FIGHTING_DAY,
  ERROR_ISSUE_NOT_EXISTED,
  ERROR_PRODUCTION_ERROR_NOT_EXISTED,
} from "../shared/errors/error.js";
import {
  isValidNumber,
  normalizeString,
  removeEmptyFields,
} from "../shared/utils/utils.js";
import _ from "lodash";
import { Project } from "../models/project.model.js";
import * as XLSX from "xlsx";
import { Product } from "../models/product.model.js";
import { Customer } from "../models/customer.model.js";
import { Event } from "../models/event.model.js";
import { Account } from "../models/account.model.js";
import { Component } from "../models/component.model.js";
import moment from "moment";
import {
  errorLevels,
  scopeOfImpacts,
  urgencyLevels,
} from "../shared/constants/constant.js";

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
      serverity,
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

    if (stopFighting && parseInt(stopFightingDays) < 1)
      throw new Error(ERROR_INVALID_STOP_FIGHTING_DAY);
    if (status === "DELIVERED" && !completionTime)
      throw new Error(ERROR_EMPTY_COMPLETION_TIME);

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
        serverity,
        status,
        type,
        level,
        responsible_handling_unit: responsibleHandlingUnit,
        reporting_person: reportingPerson,
        remain_status: remainStatus
          ? remainStatus
          : status === "PROCESSED"
          ? "DONE"
          : "REMAIN",
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

    res.send({ result: "success", issue: newIssue });
  } catch (error) {
    next(error);
  }
}

export async function getListIssue(req, res, next) {
  try {
    let {
      q,
      page,
      limit,
      status,
      projectId,
      productId,
      remainStatus,
      warrantyStatus,
      unhandleReason,
      responsibleType,
      customerId,
      componentId,
      type,
      level,
    } = req.query;

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
      // [Op.or]: [
      //   {
      //     description: { [Op.like]: `%${q}%` },
      //   },
      // ],
      [Op.and]: [
        !!status ? { status } : undefined,
        !!type ? { type } : undefined,
        !!remainStatus ? { remain_status: remainStatus } : undefined,
        !!warrantyStatus ? { warranty_status: warrantyStatus } : undefined,
        !!unhandleReason ? { unhandle_reason: unhandleReason } : undefined,
        !!responsibleType ? { responsible_type: responsibleType } : undefined,
        !!projectId ? { project_id: projectId } : undefined,
        !!productId ? { product_id: productId } : undefined,
        !!customerId ? { customer_id: customerId } : undefined,
        !!componentId ? { component_id: componentId } : undefined,
        !!level ? { level: level } : undefined,
      ].filter(Boolean),
    };

    let issues;

    if (!isValidNumber(limit) || !isValidNumber(page)) {
      page = undefined;
      limit = undefined;

      issues = await Issue.findAndCountAll({
        where: conditions,
        order: [["id", "DESC"]],
        include: [
          {
            model: Account,
            attributes: ["email", "name", "avatar", "employee_id"],
          },
          { model: Project },
          { model: Product },
          { model: Component },
        ],
      });
    } else {
      limit = _.toNumber(limit);
      page = _.toNumber(page);

      issues = await Issue.findAndCountAll({
        where: conditions,
        limit,
        offset: limit * page,
        order: [["id", "DESC"]],
        include: [
          {
            model: Account,
            attributes: ["email", "name", "avatar", "employee_id"],
          },
          { model: Project },
          { model: Product },
          { model: Component },
        ],
      });
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
    serverity,
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

    if (stopFighting && parseInt(stopFightingDays) < 1)
      throw new Error(ERROR_INVALID_STOP_FIGHTING_DAY);

    if (status === "DELIVERED" && !completionTime)
      throw new Error(ERROR_EMPTY_COMPLETION_TIME);

    await issue.update(
      removeEmptyFields({
        component_id: componentId,
        customer_id: customerId,
        product_id: productId,
        account_id: accountId,
        project_id: projectId,
        reception_time: receptionTime,
        completion_time: completionTime,
        handling_time: handlingTime,
        description,
        serverity,
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

    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}

export async function deleteIssue(req, res, next) {
  try {
    const { issueIds } = req.body;

    if (!_.isArray(issueIds)) throw new Error(ERROR_INVALID_PARAMETERS);

    let deleteCount = await Issue.destroy({
      where: { id: { [Op.in]: issueIds } },
    });

    res.send({ result: "success", deleteCount });
  } catch (error) {
    next(error);
  }
}

export async function uploadExcelFile(req, res, next) {
  try {
    const { projectId } = req.body;
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    let newCustomers = [];

    for (const item of jsonData) {
      if (!item["STT"]) continue;

      const customerName = item["Đơn vị/Tên khách hàng"];

      if (
        !newCustomers.find(
          (cs) => cs?.name?.toLowerCase() === customerName?.toLowerCase()
        )
      ) {
        const newCustomer = await Customer.create(
          removeEmptyFields({
            name: customerName,
            military_region: customerName,
            sign: customerName,
          })
        );

        newCustomers = [...newCustomers, newCustomer.toJSON()];
      }

      const customer = newCustomers.find(
        (cs) => cs?.name?.toLowerCase() == customerName?.toLowerCase()
      );

      const productSerials = !!item["No S/N"]
        ? item["No S/N"]?.split("\r\n")
        : [""];

      let newProducts = [];
      for (const prod of productSerials) {
        const newProduct = await Product.create(
          removeEmptyFields({
            serial: prod,
            name: item["Bộ phận lỗi"],
            project_id: projectId,
            customer_id: customer?.id,
            type: "HAND_OVER",
          })
        );

        await Event.create(
          removeEmptyFields({
            account_id: req.email,
            project_id: projectId,
            product_id: newProduct.toJSON()?.id,
            type: "PRODUCT",
            sub_type: "CREATE",
            content: "Thêm mới sản phẩm",
          })
        );

        newProducts = [...newProducts, newProduct.toJSON()];
      }
      // }
      for (const prod of newProducts) {
        const scopeOfImpact = scopeOfImpacts.find(
          (sc) =>
            normalizeString(sc.value) ===
            normalizeString(item?.["Phạm vi ảnh hưởng"])
        )?.name;
        const level = errorLevels.find(
          (el) =>
            normalizeString(el.value) ===
            normalizeString(item?.["Mức độ ảnh hưởng"])
        );
        const urgencyLevel = urgencyLevels.find(
          (ul) =>
            normalizeString(ul.value) ===
            normalizeString(item?.["Mức độ cấp thiết"])
        );
        console.log(urgencyLevel);

        const newIssue = await Issue.create(
          removeEmptyFields({
            product_id: prod?.id,
            project_id: projectId,
            product_count: newProducts.length > 1 ? 1 : item["Số lượng"],
            customer_id: customer?.id,
            reception_time: item["Ngày tiếp nhận"] ?? "",
            completion_time: item["Ngày hoàn thành"] ?? "",
            description: item["Hiện trạng lỗi xác nhận ở đơn vị"] ?? "",
            reason: item["Nguyên nhân lỗi"],
            responsible_type:
              item["Phân loại trách nhiệm/vật tư lỗi"] === "Chưa xác định"
                ? "UNKNOWN"
                : "MATERIAL",
            responsible_type_description:
              item["Phân loại trách nhiệm/vật tư lỗi"],
            handling_measures: item["Giải pháp sửa chữa"],
            responsible_handling_unit: item["Trách nhiệm xử lý lỗi"],
            unhandle_reason_description:
              item["Hiện trạng xử lý/ Lý do nếu chưa xử lý xong"],
            status:
              item["Hiện trạng xử lý/ Lý do nếu chưa xử lý xong"] ==
              "Hoàn thành"
                ? "PROCESSED"
                : "PROCESSING",
            unit_price: item["Đơn giá xử lý"],
            price: item["Thành tiền"],
            note: item["Ghi chú"],
            level: level?.name,
            impact_point: level?.score,
            reception_time: moment().format("YYYY-MM-DD"),
            scope_of_impact: scopeOfImpact,
            urgency_level: urgencyLevel?.name,
            urgency_point: urgencyLevel?.score,
          })
        );

        await Event.create(
          removeEmptyFields({
            account_id: req.email,
            project_id: projectId,
            issue_id: newIssue.toJSON()?.id,
            type: "ISSUE",
            sub_type: "CREATE",
            content: "Thêm lỗi mới",
          })
        );
      }
    }

    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}

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
