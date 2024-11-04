import moment from "moment";
import { Op, Sequelize } from "sequelize";
import { Customer } from "../models/customer.model.js";
import { Issue } from "../models/issue.model.js";
import { Product } from "../models/product.model.js";
import { Project } from "../models/project.model.js";
import { ERROR_EMPTY_PROJECT } from "../shared/errors/error.js";

export async function getStatisticThroughYear(req, res, next) {
  try {
    let { year, projectId } = req.query;

    const startTime = moment()
      .year(year)
      .startOf("year")
      .format("YYYY-MM-DD HH:mm:ss");
    const endTime = moment()
      .year(year)
      .endOf("year")
      .format("YYYY-MM-DD HH:mm:ss");

    const endOfPreviousYear = moment(`${year}-01-01`)
      .subtract(1, "day")
      .endOf("day")
      .format("YYYY-MM-DD HH:mm:ss");
    const startOfPreviousYear = moment(`${year}-01-01`)
      .subtract(1, "year")
      .startOf("year")
      .format("YYYY-MM-DD HH:mm:ss");

    if (!projectId) throw new Error(ERROR_EMPTY_PROJECT);

    const [project, issueCounts, cummulative] = await Promise.all([
      Project.findOne({
        where: { id: projectId },
        include: [
          {
            model: Product,
            attributes: [],
            include: [
              {
                model: Customer,
                attributes: [], // No need to fetch customer details here, just counting
              },
            ],
          },
        ],
        attributes: [
          "id", // Keep project fields
          "project_name",
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.fn("DISTINCT", Sequelize.col("products.customer_id"))
            ),
            "customerCount",
          ],
        ],
        group: ["projects.id"],
      }),
      Issue.findOne({
        where: {
          project_id: projectId,
          reception_time: { [Op.between]: [startTime, endTime] },
        },
        attributes: [
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.fn("COUNT", Sequelize.col("id")),
              0
            ),
            "receptionIssues",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                `SUM(CASE WHEN level IN ('CRITICAL', 'MAJOR') THEN 1 ELSE 0 END)`
              ),
              0
            ),
            "criticalIssues",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "SUM(CASE WHEN stop_fighting = true THEN 1 ELSE 0 END)"
              ),
              0
            ),
            "stopFightingIssues",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "SUM(CASE WHEN level = 'MODERATE' THEN 1 ELSE 0 END)"
              ),
              0
            ),
            "moderateIssues",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "SUM(CASE WHEN level = 'MINOR' THEN 1 ELSE 0 END)"
              ),
              0
            ),
            "minorIssues",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "SUM(CASE WHEN impact IN ('YES', 'RESTRICTION') THEN 1 ELSE 0 END)"
              ),
              0
            ),
            "impactReadyFightingIssue",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                `SUM(CASE WHEN status = 'PROCESSED' AND reception_time BETWEEN '${startTime}' AND '${endTime}' THEN 1 ELSE 0 END)`
              ),
              0
            ),
            "processedIssuesInYear",
          ],
          [
            Sequelize.literal(
              `CASE 
                  WHEN COUNT(id) = 0 THEN 0 
                  ELSE SUM(CASE WHEN status = 'PROCESSED' AND reception_time BETWEEN '${startTime}' AND '${endTime}' THEN 1 ELSE 0 END) / COUNT(id) * 100 
                END`
            ),
            "%",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                `COUNT(id) - SUM(CASE WHEN status = 'PROCESSED' AND reception_time BETWEEN '${startTime}' AND '${endTime}' THEN 1 ELSE 0 END)`
              ),
              0
            ),
            "remainIssues",
          ],
          [
            Sequelize.literal(
              `CASE 
                  WHEN SUM(CASE WHEN impact IN ('YES', 'RESTRICTION') AND stop_fighting = true THEN 1 ELSE 0 END) = 0 
                  THEN 0 
                  ELSE SUM(CASE WHEN impact IN ('YES', 'RESTRICTION') AND stop_fighting = true THEN handling_time ELSE 0 END) / 
                       SUM(CASE WHEN impact IN ('YES', 'RESTRICTION') AND stop_fighting = true THEN 1 ELSE 0 END) 
                END`
            ),
            "warrantyForImpactFightingIssue",
          ],

          [
            Sequelize.literal(
              `CASE 
                  WHEN COUNT(CASE WHEN product_status = 'DELIVERED' THEN 1 ELSE NULL END) = 0 
                  THEN 0 
                  ELSE SUM(CASE WHEN product_status = 'DELIVERED' THEN handling_time ELSE 0 END) / COUNT(CASE WHEN product_status = 'DELIVERED' THEN 1 ELSE NULL END) 
                END`
            ),
            "warrantyAllError",
          ],
        ],
        raw: true,
      }),
      Issue.findOne({
        where: {
          project_id: projectId,
          reception_time: { [Op.lte]: endOfPreviousYear },
        },
        attributes: [
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.fn("COUNT", Sequelize.col("id")),
              0
            ),
            "cummulativeIssues",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "SUM(CASE WHEN status = 'PROCESSED' THEN 1 ELSE 0 END)"
              ),
              0
            ),
            "processedIssues",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                `SUM(CASE WHEN status = 'PROCESSED' AND reception_time BETWEEN '${startOfPreviousYear}' AND '${endOfPreviousYear}' THEN 1 ELSE 0 END)`
              ),
              0
            ),
            "processedIssuesInPrevYear",
          ],
          [
            Sequelize.literal(
              `COALESCE(
                  SUM(CASE WHEN status = 'PROCESSED' AND reception_time BETWEEN '${startOfPreviousYear}' AND '${endOfPreviousYear}' THEN 1 ELSE 0 END) + 
                  (COUNT(id) - SUM(CASE WHEN status = 'PROCESSED' THEN 1 ELSE 0 END)), 0
                )`
            ),
            "needToProcessInPrevYear",
          ],
          [
            Sequelize.literal(
              `CASE 
                  WHEN (
                    SUM(CASE WHEN status = 'PROCESSED' AND reception_time BETWEEN '${startOfPreviousYear}' AND '${endOfPreviousYear}' THEN 1 ELSE 0 END) + 
                    (COUNT(id) - SUM(CASE WHEN status = 'PROCESSED' THEN 1 ELSE 0 END))
                  ) = 0 
                  THEN 0 
                  ELSE (
                    (SUM(CASE WHEN status = 'PROCESSED' AND reception_time BETWEEN '${startOfPreviousYear}' AND '${endOfPreviousYear}' THEN 1 ELSE 0 END) / 
                    (SUM(CASE WHEN status = 'PROCESSED' AND reception_time BETWEEN '${startOfPreviousYear}' AND '${endOfPreviousYear}' THEN 1 ELSE 0 END) + 
                    (COUNT(id) - SUM(CASE WHEN status = 'PROCESSED' THEN 1 ELSE 0 END))) * 1.0) * 100
                  )
                END`
            ),
            "%",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "COUNT(id) - SUM(CASE WHEN status = 'PROCESSED' THEN 1 ELSE 0 END)"
              ),
              0
            ),
            "remainIssues",
          ],
        ],
        raw: true,
      }),
    ]);
    res.send({
      result: "success",
      project,
      issueCounts,
      cummulative: { year: year - 1, ...cummulative },
    });
  } catch (error) {
    next(error);
  }
}

export async function getStatisticThroughMonth(req, res, next) {
  try {
    const { month, projectId } = req.query;

    const startTime = moment(month, "YYYY-MM")
      .startOf("month")
      .format("YYYY-MM-DD HH:mm:ss");
    const endTime = moment(month, "YYYY-MM")
      .endOf("month")
      .format("YYYY-MM-DD HH:mm:ss");

    const endOfPreviousMonth = moment(`${month}-01`)
      .subtract(1, "day")
      .endOf("day")
      .format("YYYY-MM-DD HH:mm:ss");

    if (!projectId) throw new Error(ERROR_EMPTY_PROJECT);

    const [project, issueCount, cummulative, totalHandledInMonth] =
      await Promise.all([
        Project.findOne({
          where: { id: projectId },
          include: [
            {
              model: Product,
              attributes: [],
              include: [
                {
                  model: Customer,
                  attributes: [],
                },
              ],
            },
          ],
          attributes: [
            "id",
            "project_name",
            [
              Sequelize.fn(
                "COUNT",
                Sequelize.fn("DISTINCT", Sequelize.col("products.customer_id"))
              ),
              "customerCount",
            ],
          ],
          group: ["projects.id"],
        }),
        Issue.findOne({
          where: {
            project_id: projectId,
            reception_time: { [Op.between]: [startTime, endTime] },
            product_status: "DELIVERED",
          },
          attributes: [
            [
              Sequelize.fn(
                "COALESCE",
                Sequelize.fn("COUNT", Sequelize.col("id")),
                0
              ),
              "receptionIssues",
            ],
            [
              Sequelize.fn(
                "COALESCE",
                Sequelize.literal(
                  `COUNT(CASE WHEN status = 'PROCESSED' AND completion_time BETWEEN '${startTime}' AND '${endTime}' THEN 1 END)`
                ),
                0
              ),
              "processedIssues",
            ],
            [
              Sequelize.fn(
                "COALESCE",
                Sequelize.literal(
                  "SUM(CASE WHEN impact IN ('YES', 'RESTRICTION') THEN 1 ELSE 0 END)"
                ),
                0
              ),
              "notReadyFightingIssues",
            ],
          ],
        }),
        Issue.findOne({
          where: {
            project_id: projectId,
            reception_time: { [Op.lte]: endOfPreviousMonth },
            product_status: "DELIVERED",
          },
          attributes: [
            [
              Sequelize.fn(
                "COALESCE",
                Sequelize.fn(
                  "COUNT",
                  Sequelize.literal(
                    `CASE WHEN completion_time >= :startTime OR completion_time IS NULL THEN id END`
                  )
                ),
                0
              ),
              "cummulativeIssues",
            ],
            [
              Sequelize.fn(
                "COALESCE",
                Sequelize.literal(
                  `COUNT(CASE WHEN status = 'PROCESSED' AND completion_time <= :endTime THEN 1 END)`
                ),
                0
              ),
              "processedIssuesCount",
            ],
            [
              Sequelize.fn(
                "COALESCE",
                Sequelize.literal(
                  "SUM(CASE WHEN impact IN ('YES', 'RESTRICTION') THEN 1 ELSE 0 END)"
                ),
                0
              ),
              "impactReadyFightingIssue",
            ],
            [
              Sequelize.fn(
                "COALESCE",
                Sequelize.literal(
                  `SUM(CASE WHEN stop_fighting = true AND remain_status = 'REMAIN' THEN 1 ELSE 0 END)`
                ),
                0
              ),
              "stopFightingIssues",
            ],
          ],
          replacements: { startTime, endTime },
        }),
        Issue.count({
          where: {
            project_id: projectId,
            completion_time: { [Op.between]: [startTime, endTime] },
            status: "PROCESSED",
            product_status: "DELIVERED",
          },
        }),
      ]);

    const hoursInMonth =
      moment(month, "YYYY-MM").daysInMonth() *
      24 *
      project?.get("customerCount");

    const warranty = await Issue.findOne({
      where: {
        project_id: projectId,
        completion_time: { [Op.between]: [startTime, endTime] },
        product_status: "DELIVERED",
      },
      attributes: [
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.literal(
              `CASE
                  WHEN SUM(CASE WHEN stop_fighting = true THEN handling_time ELSE 0 END) = 0
                  THEN 0
                  ELSE SUM(CASE WHEN stop_fighting = true THEN handling_time ELSE 0 END) / NULLIF(${
                    issueCount?.get("notReadyFightingIssues") ?? 0
                  }, 0)
              END`
            ),
            0
          ),
          "notReadyFightingWarrantyTime",
        ],
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.literal(
              `CASE
                  WHEN SUM(handling_time) = 0
                  THEN 0
                  ELSE SUM(handling_time) / NULLIF(${
                    issueCount?.get("receptionIssues") || 0
                  }, 0)
              END`
            ),
            0
          ),
          "allErrorWarrantyTime",
        ],
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.literal(
              `CASE
                  WHEN ${issueCount.get("customerCount") ?? 0} = 0 THEN 100
                  WHEN ${hoursInMonth} = 0 THEN 100
                  ELSE (${hoursInMonth} - SUM(CASE WHEN stop_fighting = true THEN handling_time ELSE 0 END)) / ${hoursInMonth} * 100
                END`
            ),
            0
          ),
          "kcd",
        ],
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.literal(
              `CASE
                  WHEN ${issueCount.get("customerCount") ?? 0} = 0 THEN 100
                  WHEN ${hoursInMonth} = 0 THEN 100
                  ELSE (${hoursInMonth} - SUM(handling_time)) / ${hoursInMonth} * 100
                END`
            ),
            0
          ),
          "kkt",
        ],
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.literal(
              `CASE
                WHEN ${project.get("customerCount") ?? 0} = 0 THEN 0
                ELSE SUM(CASE WHEN overdue_kpi = false THEN 1 ELSE 0 END) / NULLIF(${totalHandledInMonth}, 0)
              END`
            ),
            0
          ),
          "handlingRate",
        ],
      ],
    });

    const cummulativeIssues = cummulative.get("cummulativeIssues") || 0;
    const processedIssuesCount = cummulative.get("processedIssuesCount") || 0;
    const receptionIssues = issueCount.get("receptionIssues") || 0;
    const processedIssues = issueCount?.get("processedIssues") || 0;

    const remain = {};
    remain.count =
      cummulativeIssues -
      processedIssuesCount +
      receptionIssues -
      processedIssues;
    remain.handleInMonth = totalHandledInMonth - processedIssues;
    remain.totalProcessedIssue = processedIssuesCount - remain.handleInMonth;

    const averageTimeError = {};
    averageTimeError.notReadyFightingError =
      issueCount.get("notReadyFightingIssues") == 0
        ? 0
        : hoursInMonth / issueCount.get("notReadyFightingIssues");
    averageTimeError.allError =
      issueCount.get("receptionIssues") == 0
        ? 0
        : hoursInMonth / issueCount.get("receptionIssues");

    res.send({
      result: "success",
      project,
      issueCount,
      remain,
      cummulative,
      totalHandledInMonth,
      warranty,
      averageTimeError,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMultiIssue(req, res, next) {
  try {
    const { projectId } = req.body;
    await Issue.update(
      {
        product_status: "DELIVERED",
        // impact: "YES"
        completion_time: moment().format("YYYY-MM-DD"),
      },
      {
        where: {
          project_id: projectId,
          status: "PROCESSED",
        },
      }
    );
    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}

export async function getStatisticThroughWeek(req, res, next) {
  try {
    const { projectId, week } = req.query;
  } catch (error) {
    next(error);
  }
}

export async function getStatisticThroughQuarter(req, res, next) {
  try {
    const { projectId, year, quarter } = req.query;

    const startTime = moment(year)
      .add(quarter - 1, "quarter")
      .startOf("quarter")
      .format("YYYY-MM-DD HH:mm:ss");

    const endTime = moment(year)
      .add(quarter - 1, "quarter")
      .endOf("quarter")
      .format("YYYY-MM-DD HH:mm:ss");

    const endOfPreviousQuarter = moment(startTime)
      .subtract(1, "quarter")
      .endOf("quarter")
      .format("YYYY-MM-DD HH:mm:ss");

    if (!projectId) throw new Error(ERROR_EMPTY_PROJECT);

    const [
      project,
      issueCount,
      cummulative,
      totalHandledInQuarter,
      remainIssue,
    ] = await Promise.all([
      Project.findOne({
        where: { id: projectId },
        include: [
          {
            model: Product,
            attributes: [],
            include: [
              {
                model: Customer,
                attributes: [],
              },
            ],
          },
        ],
        attributes: [
          "id",
          "project_name",
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.fn("DISTINCT", Sequelize.col("products.customer_id"))
            ),
            "customerCount",
          ],
        ],
        group: ["projects.id"],
      }),
      Issue.findOne({
        where: {
          project_id: projectId,
          reception_time: { [Op.between]: [startTime, endTime] },
          product_status: "DELIVERED",
        },
        attributes: [
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.fn("COUNT", Sequelize.col("id")),
              0
            ),
            "receptionIssues",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                `COUNT(CASE WHEN status = 'PROCESSED' AND completion_time BETWEEN '${startTime}' AND '${endTime}' THEN 1 END)`
              ),
              0
            ),
            "processedIssues",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "SUM(CASE WHEN impact IN ('YES', 'RESTRICTION') THEN 1 ELSE 0 END)"
              ),
              0
            ),
            "notReadyFightingIssues",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "SUM(CASE WHEN level IN ('CRITICAL', 'MAJOR') THEN 1 ELSE 0 END)"
              ),
              0
            ),
            "criticalIssue",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "SUM(CASE WHEN level = 'MODERATE' THEN 1 ELSE 0 END)"
              ),
              0
            ),
            "moderateIssue",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "SUM(CASE WHEN level = 'MINOR' THEN 1 ELSE 0 END)"
              ),
              0
            ),
            "minorIssue",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "SUM(CASE WHEN stop_fighting = true THEN 1 ELSE 0 END)"
              ),
              0
            ),
            "stopFightingIssue",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "SUM(CASE WHEN stop_fighting = true THEN handling_time ELSE 0 END)"
              ),
              0
            ),
            "stopFightingTime",
          ],
        ],
      }),
      Issue.findOne({
        where: {
          project_id: projectId,
          reception_time: { [Op.lte]: endOfPreviousQuarter },
          product_status: "DELIVERED",
        },
        attributes: [
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.fn(
                "COUNT",
                Sequelize.literal(
                  `CASE WHEN completion_time >= :startTime OR completion_time IS NULL THEN id END`
                )
              ),
              0
            ),
            "cummulativeIssues",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                `COUNT(CASE WHEN status = 'PROCESSED' AND completion_time <= :endTime THEN 1 END)`
              ),
              0
            ),
            "processedIssuesCount",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "SUM(CASE WHEN impact IN ('YES', 'RESTRICTION') THEN 1 ELSE 0 END)"
              ),
              0
            ),
            "impactReadyFightingIssue",
          ],
        ],
        replacements: { startTime, endTime },
      }),
      Issue.count({
        where: {
          project_id: projectId,
          completion_time: { [Op.between]: [startTime, endTime] },
          status: "PROCESSED",
          product_status: "DELIVERED",
        },
      }),
      Issue.findOne({
        where: {
          project_id: projectId,
          reception_time: { [Op.lte]: endTime },
          product_status: "DELIVERED",
          status: { [Op.in]: ["PROCESSING", "UNPROCESSED"] },
        },
        attributes: [
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "SUM(CASE WHEN level IN ('CRITICAL', 'MAJOR') THEN 1 ELSE 0 END)"
              ),
              0
            ),
            "criticalIssue",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "SUM(CASE WHEN level = 'MODERATE' THEN 1 ELSE 0 END)"
              ),
              0
            ),
            "moderateIssue",
          ],
          [
            Sequelize.fn(
              "COALESCE",
              Sequelize.literal(
                "SUM(CASE WHEN level = 'MINOR' THEN 1 ELSE 0 END)"
              ),
              0
            ),
            "minorIssue",
          ],
        ],
      }),
    ]);

    const hoursInQuarter =
      (moment(endTime).diff(startTime, "days") + 1) *
      24 *
      project?.get("customerCount");

    const warranty = await Issue.findOne({
      where: {
        project_id: projectId,
        completion_time: { [Op.between]: [startTime, endTime] },
        product_status: "DELIVERED",
      },
      attributes: [
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.literal(
              `CASE
                    WHEN SUM(CASE WHEN stop_fighting = true THEN handling_time ELSE 0 END) = 0
                    THEN 0
                    ELSE SUM(CASE WHEN stop_fighting = true THEN handling_time ELSE 0 END) / NULLIF(${
                      issueCount?.get("notReadyFightingIssues") ?? 0
                    }, 0)
                END`
            ),
            0
          ),
          "notReadyFightingWarrantyTime",
        ],
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.literal(
              `CASE
                    WHEN SUM(handling_time) = 0
                    THEN 0
                    ELSE SUM(handling_time) / NULLIF(${
                      issueCount?.get("receptionIssues") || 0
                    }, 0)
                END`
            ),
            0
          ),
          "allErrorWarrantyTime",
        ],
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.literal(
              `CASE
                    WHEN ${issueCount.get("customerCount") ?? 0} = 0 THEN 100
                    WHEN ${hoursInQuarter} = 0 THEN 100
                    ELSE (${hoursInQuarter} - SUM(CASE WHEN stop_fighting = true THEN handling_time ELSE 0 END)) / ${hoursInQuarter} * 100
                  END`
            ),
            0
          ),
          "kcd",
        ],
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.literal(
              `CASE
                    WHEN ${issueCount.get("customerCount") ?? 0} = 0 THEN 100
                    WHEN ${hoursInQuarter} = 0 THEN 100
                    ELSE (${hoursInQuarter} - SUM(handling_time)) / ${hoursInQuarter} * 100
                  END`
            ),
            0
          ),
          "kkt",
        ],
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.literal(
              `CASE
                  WHEN ${project.get("customerCount") ?? 0} = 0 THEN 0
                  ELSE SUM(CASE WHEN overdue_kpi = false THEN 1 ELSE 0 END) / NULLIF(${totalHandledInQuarter}, 0)
                END`
            ),
            0
          ),
          "handlingRate",
        ],
      ],
    });

    const cummulativeIssues = cummulative.get("cummulativeIssues") || 0;
    const processedIssuesCount = cummulative.get("processedIssuesCount") || 0;
    const receptionIssues = issueCount.get("receptionIssues") || 0;
    const processedIssues = issueCount?.get("processedIssues") || 0;

    const remain = {};
    remain.count =
      cummulativeIssues -
      processedIssuesCount +
      receptionIssues -
      processedIssues;
    remain.handleInQuarter = totalHandledInQuarter - processedIssues;
    remain.totalProcessedIssue = processedIssuesCount - remain.handleInQuarter;

    const averageTimeError = {};
    averageTimeError.notReadyFightingError =
      issueCount.get("notReadyFightingIssues") == 0
        ? 0
        : hoursInQuarter / issueCount.get("notReadyFightingIssues");
    averageTimeError.allError =
      issueCount.get("receptionIssues") == 0
        ? 0
        : hoursInQuarter / issueCount.get("receptionIssues");

    res.send({
      result: "success",
      project,
      issueCount,
      remain,
      cummulative,
      totalHandledInQuarter,
      warranty,
      averageTimeError,
      remainIssue,
    });
  } catch (error) {
    next(error);
  }
}
