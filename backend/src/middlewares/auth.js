import { verifyAccessToken } from '../utils/tokenUtils.js';
import { User } from '../models/User.js';
import { sendError } from '../utils/apiResponse.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header: Bearer <token>
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return sendError(res, 'Authentication required. No token provided.', [], 401);
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return sendError(res, 'Invalid or expired authentication token.', [], 401);
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return sendError(res, 'User no longer exists.', [], 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Account has been deactivated. Please contact an administrator.', [], 403);
    }

    // Attach user to request
    req.user = {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      managerId: user.managerId ? user.managerId.toString() : null,
    };

    next();
  } catch (error) {
    return sendError(res, 'Authentication error.', [error.message], 500);
  }
};
