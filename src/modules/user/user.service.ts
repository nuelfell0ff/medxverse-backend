import { User } from './user.model.js';
import { CreateUserDto, UpdateUserDto, UserQueryFilters } from './user.types.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateStaffCode } from '../../utils/generator.js';
import { UserRole } from '../../constants/roles.enum.js';

export class UserService {
  /**
   * Generates role-based prefix for staff codes
   */
  private static getRolePrefix(role: UserRole): string {
    switch (role) {
      case UserRole.DOCTOR:
        return 'DOC';
      case UserRole.NURSE:
        return 'NRS';
      case UserRole.PHARMACIST:
        return 'PHM';
      case UserRole.LAB_TECHNICIAN:
        return 'LAB';
      case UserRole.RADIOLOGIST:
        return 'RAD';
      case UserRole.HMO_CLAIMS_OFFICER:
      case UserRole.HMO_MEDICAL_OFFICER:
        return 'HMO';
      case UserRole.BILLING_OFFICER:
        return 'BIL';
      default:
        return 'STF';
    }
  }

  /**
   * Registers a new staff member under an organization
   */
  static async createUser(dto: CreateUserDto, authenticatedUserOrgId: string) {
    const targetOrgId = dto.organizationId || authenticatedUserOrgId;

    const existingUser = await User.findOne({ email: dto.email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(409, `User with email ${dto.email} already exists.`);
    }

    const rolePrefix = this.getRolePrefix(dto.role);
    const staffCode = generateStaffCode(rolePrefix);

    const defaultPassword = dto.password || 'MedxVerse@2026';

    const user = await User.create({
      ...dto,
      email: dto.email.toLowerCase(),
      password: defaultPassword,
      organizationId: targetOrgId,
      staffCode,
    });

    const createdUser = await User.findById(user._id).select('-password');
    return createdUser;
  }

  /**
   * Retrieves paginated list of staff members for an organization
   */
  static async getUsersByOrganization(
    organizationId: string,
    filters: UserQueryFilters
  ) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const query: any = { organizationId };

    if (filters.role) query.role = filters.role;
    if (filters.department) query.department = filters.department;
    if (typeof filters.isActive === 'boolean') query.isActive = filters.isActive;

    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { staffCode: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetches single staff user by ID
   */
  static async getUserById(userId: string, organizationId: string) {
    const user = await User.findOne({ _id: userId, organizationId }).select('-password');
    if (!user) {
      throw new ApiError(404, 'Staff member not found in your organization.');
    }
    return user;
  }

  /**
   * Updates staff profile information
   */
  static async updateUser(
    userId: string,
    dto: UpdateUserDto,
    organizationId: string
  ) {
    const user = await User.findOneAndUpdate(
      { _id: userId, organizationId },
      { $set: dto },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw new ApiError(404, 'Staff member not found or permission denied.');
    }

    return user;
  }

  /**
   * Toggles staff active status (Deactivate / Reactivate)
   */
  static async toggleUserStatus(userId: string, organizationId: string) {
    const user = await User.findOne({ _id: userId, organizationId });
    if (!user) {
      throw new ApiError(404, 'Staff member not found.');
    }

    user.isActive = !user.isActive;
    await user.save();

    return {
      id: user._id,
      email: user.email,
      isActive: user.isActive,
    };
  }
}