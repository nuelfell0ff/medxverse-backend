import { Types } from 'mongoose';
import { BedModel, WardModel } from './bed-ward.model.js';
import type { BedMatchRequest, BedMatchSuggestion, IBedRequirements } from './bed-ward.types.js';
import { BedStatus } from './bed-ward.types.js';

function objectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new Error(`Invalid ObjectId: ${id}`);
  return new Types.ObjectId(id);
}

function requirementMatches(requirements: IBedRequirements, bed: {
  supportedAcuityLevels: number[];
  capabilities: Map<string, boolean> | Record<string, boolean>;
  genderRestriction?: string;
  bedType: string;
}): { compatible: boolean; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const capabilities = bed.capabilities instanceof Map ? Object.fromEntries(bed.capabilities) : bed.capabilities;

  if (requirements.acuityLevel) {
    if (!bed.supportedAcuityLevels.includes(Number(requirements.acuityLevel))) return { compatible: false, reasons, warnings };
    reasons.push(`Supports acuity ${requirements.acuityLevel}`);
  }

  const capabilityMap: Array<[keyof IBedRequirements, string, string]> = [
    ['isolation', 'isolation', 'Isolation'],
    ['negativePressure', 'negativePressure', 'Negative-pressure'],
    ['oxygen', 'oxygen', 'Oxygen'],
    ['cardiacMonitor', 'cardiacMonitor', 'Cardiac monitoring'],
    ['pediatric', 'pediatric', 'Pediatric'],
    ['bariatric', 'bariatric', 'Bariatric'],
    ['mentalHealthSafeSpace', 'mentalHealthSafeSpace', 'Mental-health safe space'],
  ];

  for (const [requirementKey, capabilityKey, label] of capabilityMap) {
    if (requirements[requirementKey] === true) {
      if (capabilities[capabilityKey] !== true) return { compatible: false, reasons, warnings };
      reasons.push(`${label} capability`);
    }
  }

  if (requirements.bedType && bed.bedType !== requirements.bedType.toUpperCase()) return { compatible: false, reasons, warnings };

  if (requirements.gender && bed.genderRestriction && bed.genderRestriction.toUpperCase() !== requirements.gender.toUpperCase()) {
    return { compatible: false, reasons, warnings };
  }

  if (requirements.department) reasons.push(`Requested department: ${requirements.department}`);
  if (requirements.acuityLevel && Number(requirements.acuityLevel) <= 2) warnings.push('High-acuity patient: confirm clinical readiness before assignment.');

  return { compatible: true, reasons, warnings };
}

export class BedMatchingService {
  public async suggest(input: BedMatchRequest, limit = 10): Promise<BedMatchSuggestion[]> {
    const hospitalId = objectId(input.hospitalId);
    const requirements = input.requirements || {};

    const wards = await WardModel.find({
      hospitalId,
      active: true,
      ...(requirements.department ? { department: new RegExp(`^${requirements.department}$`, 'i') } : {}),
    }).lean().exec();

    if (!wards.length) return [];

    const wardIds = wards.map((ward) => ward._id);
    const beds = await BedModel.find({
      hospitalId,
      wardId: { $in: wardIds },
      status: BedStatus.AVAILABLE,
    }).lean().exec();

    const wardMap = new Map(wards.map((ward) => [String(ward._id), ward]));

    const suggestions: Array<BedMatchSuggestion | null> = beds
      .map((bed) => {
        const ward = wardMap.get(String(bed.wardId));
        if (!ward) return null;

        const match = requirementMatches(requirements, {
          supportedAcuityLevels: bed.supportedAcuityLevels || [],
          capabilities: bed.capabilities as Map<string, boolean> | Record<string, boolean>,
          genderRestriction: bed.genderRestriction,
          bedType: bed.bedType,
        });
        if (!match.compatible) return null;

        let score = 100;
        if (requirements.department && ward.department?.toLowerCase() === requirements.department.toLowerCase()) score += 40;
        if (requirements.bedType && bed.bedType === requirements.bedType.toUpperCase()) score += 35;
        if (requirements.acuityLevel && bed.supportedAcuityLevels.includes(Number(requirements.acuityLevel))) score += 30;

        return { bed: bed as unknown as BedMatchSuggestion['bed'], ward: ward as unknown as BedMatchSuggestion['ward'], score, reasons: match.reasons, warnings: match.warnings };
      })
      .filter((value): value is BedMatchSuggestion => Boolean(value))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(50, limit)));

    return suggestions.filter(Boolean) as BedMatchSuggestion[];
  }
}

export const bedMatchingService = new BedMatchingService();
