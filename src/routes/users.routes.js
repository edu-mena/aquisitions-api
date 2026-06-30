import express from 'express';
import authenticate from '#middleware/auth.middleware.js';
import {
  fetchAllUsers,
  fetchUserById,
  updateUser,
  deleteUser,
} from '#controllers/users.controller.js';

const router = express.Router();

router.get('/', authenticate, fetchAllUsers);
router.get('/:id', authenticate, fetchUserById);
router.put('/:id', authenticate, updateUser);
router.delete('/:id', authenticate, deleteUser);

export default router;
