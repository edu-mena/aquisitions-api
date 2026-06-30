import jwt from 'jsonwebtoken';
import logger from '#config/logger.js';

const JWT_SECRET =
  process.env.JWT_SECRET || 'chave-secreta-jwt-mudar-em-produção';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

export const jwttoken = {
  sign: payloud => {
    try {
      return jwt.sign(payloud, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    } catch (e) {
      logger.error('Erro de autenticação do JWT', e);
      throw new Error('Erro de autenticação do JWT', e);
    }
  },
  verify: token => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (e) {
      logger.error('Erro de autenticação do JWT', e);
      throw new Error('Erro de autenticação do JWT', e);
    }
  },
};
