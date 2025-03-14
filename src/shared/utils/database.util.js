import { QueryTypes } from "sequelize";
import { database } from "../../configs/sequelize.config.js";

export const getIssuesByComponent = async (componentId) => {
    const query = `
        WITH RECURSIVE component_tree AS (
            SELECT id FROM components WHERE id = :componentId
            UNION ALL
            SELECT c.id FROM components c
            INNER JOIN component_tree ct ON c.parent_id = ct.id
        )
        SELECT i.id, i.component_id, i.status
        FROM issues i
        JOIN component_tree ct ON i.component_id = ct.id;
    `;

    const issues = await database.query(query, {
        type: QueryTypes.SELECT,
        replacements: { componentId },
    });

    return issues;
};
