import moment from "moment";
import cron from "node-cron";
import { AccessToken } from "../models/access_token.model.js";
import { Op } from "sequelize";

const TAG = "[cronjobs.clearExpiredToken]";

export async function clearExpiredToken() {
  cron.schedule("0 0 * * *", async () => {
    try {
      // Find and delete tokens that have expired
      await AccessToken.destroy({
        where: {
          expiry_date: { [Op.lte]: moment().toDate() },
        },
      });

      console.log(
        TAG,
        `${moment().format(
          "DD/MM/YYYY HH:mm"
        )} Expired tokens removed successfully.\n`
      );
    } catch (error) {
      console.error(
        TAG,
        `${moment().format(
          "DD/MM/YYYY HH:mm"
        )} error while clear expired token ${error.message} \n`
      );
    }
  });
}
