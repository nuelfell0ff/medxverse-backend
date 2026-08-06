import { Organization } from './organization.model.js';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationQueryFilters,
} from './organization.types.js';
import { ApiError } from '../../utils/ApiError.js';

export class OrganizationService {
  /**
   * Helper to generate organization code if not manually provided
   * Format: HOSP-XXXX or HMO-XXXX
   */
  private static generateOrgCode(name: string, type: string): string {
    const cleanName = name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
    const prefix = type === 'HOSPITAL' ? 'HSP' : 'HMO';
    const random = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${cleanName}${random}`;
  }

  /**
   * Registers a new Hospital or HMO organization
   */
  static async createOrganization(dto: CreateOrganizationDto) {
    const orgCode = dto.code
      ? dto.code.toUpperCase()
      : this.generateOrgCode(dto.name, dto.type);

    const existingCode = await Organization.findOne({ code: orgCode });
    if (existingCode) {
      throw new ApiError(409, `Organization with code '${orgCode}' already exists.`);
    }

    const organization = await Organization.create({
      ...dto,
      code: orgCode,
      email: dto.email.toLowerCase(),
    });

    return organization;
  }

  /**
   * Retrieves paginated list of organizations with search & status filters
   */
  static async getOrganizations(filters: OrganizationQueryFilters) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (filters.type) query.type = filters.type;
    if (typeof filters.isActive === 'boolean') query.isActive = filters.isActive;

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [organizations, total] = await Promise.all([
      Organization.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Organization.countDocuments(query),
    ]);

    return {
      organizations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gets single organization by ID
   */
  static async getOrganizationById(id: string) {
    const organization = await Organization.findById(id);
    if (!organization) {
      throw new ApiError(404, 'Organization record not found.');
    }
    return organization;
  }

  /**
   * Updates organization details
   */
  static async updateOrganization(id: string, dto: UpdateOrganizationDto) {
    const organization = await Organization.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true, runValidators: true }
    );

    if (!organization) {
      throw new ApiError(404, 'Organization record not found.');
    }

    return organization;
  }

  /**
   * Toggles active state of an organization
   */
  static async toggleOrganizationStatus(id: string) {
    const organization = await Organization.findById(id);
    if (!organization) {
      throw new ApiError(404, 'Organization record not found.');
    }

    organization.isActive = !organization.isActive;
    await organization.save();

    return {
      id: organization._id,
      name: organization.name,
      isActive: organization.isActive,
    };
  }
}