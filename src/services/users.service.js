import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import logger from '#config/logger.js';
import { db } from '#config/database.js';
import { users } from '#models/users.model.js';

const userPublicFields = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  created_at: users.created_at,
  updated_at: users.updated_at,
};

export const getAllUsers = async () => {
  try {
    return await db.select(userPublicFields).from(users);
  } catch (e) {
    logger.error('Erro ao buscar usuários: ', e);
    throw e;
  }
};

export const getUserById = async id => {
  try {
    const [user] = await db
      .select(userPublicFields)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  } catch (e) {
    logger.error('Erro ao buscar usuário por ID: ', e);
    throw e;
  }
};

export const updateUser = async (id, updates) => {
  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing) throw new Error('User not found');

    const payload = { ...updates };
    if (payload.password) {
      payload.password = await bcrypt.hash(payload.password, 12);
    }

    const [updated] = await db
      .update(users)
      .set({ ...payload, updated_at: new Date() })
      .where(eq(users.id, id))
      .returning(userPublicFields);

    return updated;
  } catch (e) {
    logger.error('Erro ao atualizar usuário: ', e);
    throw e;
  }
};

export const deleteUser = async id => {
  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing) throw new Error('User not found');

    await db.delete(users).where(eq(users.id, id));
  } catch (e) {
    logger.error('Erro ao deletar usuário: ', e);
    throw e;
  }
};
