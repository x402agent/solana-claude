import type { NextApiHandler } from 'next';
import { requireGateSession } from '../../server/core/gate';
import { getHostedSkills, getHostedSkillSummary } from '../../server/core/skills';

const handler: NextApiHandler = async (request, response) => {
    try {
        requireGateSession(request);
        response.status(200).json({
            access: 'granted',
            summary: getHostedSkillSummary(),
            skills: getHostedSkills(),
        });
    } catch {
        response.status(401).json({
            access: 'denied',
            error: 'clawd_gate_required',
            message: 'Pay 6.9420 CLAWD to unlock the hosted skill catalog.',
        });
    }
};

export default handler;
