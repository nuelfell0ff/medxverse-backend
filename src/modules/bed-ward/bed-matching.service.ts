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

    const wards = await WardModel.find({ hospitalId, active: true }).lean().exec();
    if (!wards.length) return [];
    const wardMap = new Map(wards.map((ward) => [String(ward._id), ward]));
    const beds = await BedModel.find({ hospitalId, wardId: { $in: wards.map((ward) => ward._id) }, status: BedStatus.AVAILABLE }).lean().exec();

    const exact: BedMatchSuggestion[] = [];
    const fallback: BedMatchSuggestion[] = [];

    for (const bed of beds) {
      const ward = wardMap.get(String(bed.wardId));
      if (!ward) continue;
      const match = requirementMatches(requirements, {
        supportedAcuityLevels: bed.supportedAcuityLevels || [],
        capabilities: bed.capabilities as Map<string, boolean> | Record<string, boolean>,
        genderRestriction: bed.genderRestriction,
        bedType: bed.bedType,
      });

      if (match.compatible && (!requirements.department || ward.department?.toLowerCase() === requirements.department.toLowerCase())) {
        let score = 100;
        if (requirements.department && ward.department?.toLowerCase() === requirements.department.toLowerCase()) score += 40;
        if (requirements.bedType && bed.bedType === requirements.bedType.toUpperCase()) score += 35;
        if (requirements.acuityLevel && bed.supportedAcuityLevels.includes(Number(requirements.acuityLevel))) score += 30;
        exact.push({ bed: bed as unknown as BedMatchSuggestion['bed'], ward: ward as unknown as BedMatchSuggestion['ward'], score, reasons: match.reasons, warnings: match.warnings });
        continue;
      }

      // No perfect match: keep the available bed as a fallback option and
      // explain exactly what the operator should verify before selecting it.
      const reasons: string[] = ['Available now'];
      const warnings: string[] = ['No fully matching bed was available; operator review required.'];
      let score = 45;
      if (requirements.department) {
        if (ward.department?.toLowerCase() === requirements.department.toLowerCase()) { score += 25; reasons.push('Same department'); }
        else warnings.push(`Different department: ${ward.department || 'unspecified'}`);
      }
      if (requirements.bedType) {
        if (bed.bedType === requirements.bedType.toUpperCase()) { score += 20; reasons.push('Requested bed type'); }
        else warnings.push(`Bed type is ${bed.bedType}, requested ${requirements.bedType.toUpperCase()}`);
      }
      if (requirements.acuityLevel) {
        if (bed.supportedAcuityLevels.includes(Number(requirements.acuityLevel))) { score += 20; reasons.push(`Supports acuity ${requirements.acuityLevel}`); }
        else warnings.push(`Does not list acuity ${requirements.acuityLevel} support`);
      }
      const caps = bed.capabilities instanceof Map ? Object.fromEntries(bed.capabilities) : (bed.capabilities || {});
      for (const [key, label] of [['isolation','Isolation'],['negativePressure','Negative-pressure'],['oxygen','Oxygen'],['cardiacMonitor','Cardiac monitoring'],['pediatric','Pediatric'],['bariatric','Bariatric'],['mentalHealthSafeSpace','Mental-health safe space']] as const) {
        if (requirements[key]) {
          if (caps[key] === true) { score += 8; reasons.push(`${label} capability`); }
          else warnings.push(`Missing ${label} capability`);
        }
      }
      if (requirements.gender && bed.genderRestriction && bed.genderRestriction.toUpperCase() !== requirements.gender.toUpperCase()) warnings.push(`Gender restriction: ${bed.genderRestriction}`);
      fallback.push({ bed: bed as unknown as BedMatchSuggestion['bed'], ward: ward as unknown as BedMatchSuggestion['ward'], score, reasons, warnings });
    }

    return [...exact.sort((a,b)=>b.score-a.score), ...fallback.sort((a,b)=>b.score-a.score)].slice(0, Math.max(1, Math.min(50, limit)));
  }
}

export const bedMatchingService = new BedMatchingService();
