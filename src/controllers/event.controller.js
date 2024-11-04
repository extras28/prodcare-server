import { Op } from "sequelize";
import { Event } from "../models/event.model.js";
import {
  ERROR_EVENT_NOT_EXISTED,
  ERROR_INVALID_PARAMETERS,
} from "../shared/errors/error.js";
import { isValidNumber, removeEmptyFields } from "../shared/utils/utils.js";
import _ from "lodash";
import { Account } from "../models/account.model.js";
import moment from "moment";

export async function createEvent(req, res, next) {
  try {
    const {
      projectId,
      type,
      subType,
      content,
      productId,
      issueId,
      componentId,
    } = req.body;

    const email = req.email;

    await Event.create(
      removeEmptyFields({
        project_id: projectId,
        product_id: productId,
        type,
        sub_type: subType,
        content,
        issue_id: issueId,
        component_id: componentId,
        account_id: email,
      })
    );

    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}

export async function updateEvent(req, res, next) {
  try {
    const {
      id,
      projectId,
      type,
      subType,
      content,
      productId,
      issueId,
      componentId,
    } = req.body;

    const event = await Event.findOne({ where: { id: id } });

    if (!event) throw new Error(ERROR_EVENT_NOT_EXISTED);

    await event.update(
      removeEmptyFields({
        project_id: projectId,
        product_id: productId,
        type,
        sub_type: subType,
        content,
        issue_id: issueId,
        component_id: componentId,
      })
    );

    res.send({ result: "success" });
  } catch (error) {
    next(error);
  }
}

export async function getListEvent(req, res, next) {
  try {
    let {
      q,
      page,
      limit,
      projectId,
      accountId,
      productId,
      issueId,
      componentId,
      type,
      subType,
    } = req.query;

    q = q ?? "";

    const conditions = {
      [Op.or]: [{ content: { [Op.like]: `%${q}%` } }],
      [Op.and]: [
        !!projectId ? { project_id: projectId } : undefined,
        !!issueId ? { issue_id: issueId } : undefined,
        !!productId ? { product_id: productId } : undefined,
        !!componentId ? { component_id: componentId } : undefined,
        !!type ? { type: type } : undefined,
        !!subType ? { sub_type: subType } : undefined,
        !!accountId ? { account_id: accountId } : undefined,
      ].filter(Boolean),
    };

    let events = [];

    if (!isValidNumber(limit) || !isValidNumber(page)) {
      page = undefined;
      limit = undefined;

      events = await Event.findAndCountAll({
        where: conditions,
        order: [["id", "ASC"]],
        include: {
          model: Account,
          attributes: ["email", "name", "avatar", "employee_id"], // Specify the fields to include from Account
        },
      });
    } else {
      limit = _.toNumber(limit);
      page = _.toNumber(page);

      events = await Event.findAndCountAll({
        where: conditions,
        limit,
        offset: limit * page,
        order: [["id", "ASC"]],
        include: {
          model: Account,
          attributes: ["email", "name", "avatar", "employee_id"], // Specify the fields to include from Account
        },
      });
    }

    // Calculate the time difference in seconds for each event
    const currentTime = moment(); // Get the current time
    events.rows.forEach((event) => {
      const createdAt = moment(event.createdAt); // Convert createdAt to a moment object
      const diffInSeconds = currentTime.diff(createdAt, "seconds"); // Calculate the difference in seconds

      // Add the time difference in seconds to the event object
      event.setDataValue("timeDifferenceInSeconds", diffInSeconds);
    });

    res.send({
      result: "success",
      page,
      total: events.count,
      count: events.rows.length,
      events: events.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteEvent(req, res, next) {
  try {
    const { eventIds } = req.body;

    if (!_.isArray(eventIds)) throw new Error(ERROR_INVALID_PARAMETERS);

    let deleteCount = await Event.destroy({
      where: { id: { [Op.in]: eventIds } },
    });

    res.send({ result: "success", deleteCount });
  } catch (error) {
    next(error);
  }
}
