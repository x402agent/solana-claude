import type { NextApiHandler } from 'next';
import { getHostedSkills, getHostedSkillSummary } from '../../server/core/skills';

const handler: NextApiHandler = async (_request, response) => {
    response.status(200).json({
        summary: getHostedSkillSummary(),
        skills: getHostedSkills(),
    });
};

export default handler;
