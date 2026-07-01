import { jwttoken } from '#utils/jwt.js';
import { cookies } from '#utils/cookies.js';
import logger from '#config/logger.js';

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;
    const token = bearerToken || cookies.get(req, 'token');

    if (!token) {
      return res
        .status(401)
        .json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    const payload = jwttoken.verify(token);
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch (e) {
    logger.warn('Invalid or expired token', e);
    return res
      .status(401)
      .json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
};

export default authenticate;
