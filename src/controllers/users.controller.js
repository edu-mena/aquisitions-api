import logger from '#config/logger.js';
import formatValidationErrors from '#utils/format.js';
import { userIdSchema, updateUserSchema } from '#validations/users.validations.js';
import {
  getAllUsers,
  getUserById as getUserByIdService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
} from '#services/users.service.js';

export const fetchAllUsers = async (req, res, next) => {
  try {
    logger.info('Buscando usuários na base de dados...');

    const allUsers = await getAllUsers();

    res.json({
      message: 'Busca bem sucedida',
      users: allUsers,
      count: allUsers.length,
    });
  } catch (e) {
    logger.error('Error fetching all users: ', e);
    next(e);
  }
};

export const fetchUserById = async (req, res, next) => {
  try {
    const validation = userIdSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Failed',
        details: formatValidationErrors(validation.error),
      });
    }

    const { id } = validation.data;
    const user = await getUserByIdService(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`User ${id} fetched successfully`);
    res.status(200).json({ user });
  } catch (e) {
    logger.error('Error fetching user by ID: ', e);
    next(e);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const paramsValidation = userIdSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res.status(400).json({
        error: 'Validation Failed',
        details: formatValidationErrors(paramsValidation.error),
      });
    }

    const bodyValidation = updateUserSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation Failed',
        details: formatValidationErrors(bodyValidation.error),
      });
    }

    const { id } = paramsValidation.data;
    const updates = bodyValidation.data;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own information',
      });
    }

    if (updates.role !== undefined && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can change user roles',
      });
    }

    const user = await updateUserService(id, updates);

    logger.info(`User ${id} updated successfully`);
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (e) {
    logger.error('Error updating user: ', e);

    if (e.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    next(e);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const validation = userIdSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Failed',
        details: formatValidationErrors(validation.error),
      });
    }

    const { id } = validation.data;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own account',
      });
    }

    await deleteUserService(id);

    logger.info(`User ${id} deleted successfully`);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (e) {
    logger.error('Error deleting user: ', e);

    if (e.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    next(e);
  }
};
