import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from './user.model.js';
import { Organization } from '../organization/organization.model.js'; // Fixed .ts to .js
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '8h',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || 'refresh_secret', {
    expiresIn: '7d',
  });
  return { accessToken, refreshToken };
};

export const registerOrgAndAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgName, orgCode, orgType, orgEmail, orgPhone, orgAddress, firstName, lastName, email, password, phone, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new ApiError(400, 'User email already registered');

    const existingOrg = await Organization.findOne({ code: orgCode });
    if (existingOrg) throw new ApiError(400, 'Organization code already exists');

    // Create Tenant Organization
    const organization = await Organization.create({
      name: orgName,
      code: orgCode,
      type: orgType,
      email: orgEmail,
      phone: orgPhone,
      address: orgAddress,
    });

    // Create Initial Admin for Organization
    const user = await User.create({
      organizationId: organization._id.toString(),
      orgType,
      firstName,
      lastName,
      email,
      password,
      phone,
      role,
    });

    const { accessToken, refreshToken } = generateTokens(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save();

    const userObj: Record<string, any> = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;

    return res.status(201).json(
      new ApiResponse(201, { organization, user: userObj, accessToken, refreshToken }, 'Organization registered successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password').populate('organizationId');

    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) throw new ApiError(403, 'Account deactivated');

    const { accessToken, refreshToken } = generateTokens(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save();

    const userObj: Record<string, any> = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;

    return res.status(200).json(
      new ApiResponse(200, { user: userObj, accessToken, refreshToken }, 'Login successful')
    );
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return res.status(200).json(new ApiResponse(200, req.user, 'Profile retrieved'));
  } catch (error) {
    next(error);
  }
};