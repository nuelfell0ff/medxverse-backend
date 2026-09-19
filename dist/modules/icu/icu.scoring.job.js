import { Types } from 'mongoose';
import { icuScoringService } from './icu.scoring.service.js';
/**
 * Hook this function into the hospital's existing job/cron infrastructure
 * at the desired cadence (for example, every 1-5 minutes). It is deliberately
 * not self-scheduling so the application controls worker lifecycle and
 * avoids duplicate schedulers in horizontally scaled API processes.
 */
export async function recalculateActiveICUScores(hospitalId, actorId) {
    if (!Types.ObjectId.isValid(hospitalId) || !Types.ObjectId.isValid(actorId)) {
        throw new Error('Invalid hospital or actor ID.');
    }
    return icuScoringService.recalculateActiveAdmissions(hospitalId, actorId);
}
