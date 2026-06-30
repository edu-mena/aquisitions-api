import aj from '#config/arcjet.js';
import logger from '#config/logger.js';
import { slidingWindow } from '@arcjet/node';

const securityMiddleware = async (req, res, next) => {
  try {
    const role = req.user?.role || 'guest';

    let limit;
    let message;

    switch (role) {
      case 'admin':
        limit = 30;
        message =
          'Como administrador tem apenas permissão para 30 requisições por cada 30 segundos. Vá com mais calma!';
        break;
      case 'user':
        limit = 20;
        message =
          'Como utilizador tem apenas permissão para 20 requisições por cada 30 segundos. Vá com mais calma!';
        break;
      case 'guest':
        limit = 5;
        message =
          'Como visitante tem apenas permissão para 5 requisições por cada 30 segundos. Vá com mais calma!';
        break;
      default:
        limit = 5;
        message = 'Limite de requisições excedido.';
    }

    const client = aj.withRule(
      slidingWindow({
        mode: 'LIVE',
        interval: '1m',
        max: limit,
        name: `${role}-rate-limit`,
      })
    );

    const decision = await client.protect(req);

    if (decision.isDenied() && decision.reason.isBot()) {
      logger.warn('Bot bloqueado', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'Bots não são aceites' });
    }

    if (decision.isDenied() && decision.reason.isShield()) {
      logger.warn('Requisição bloqueada por Shield', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Tentativa de hacking detetada',
      });
    }

    if (decision.isDenied() && decision.reason.isRateLimit()) {
      logger.warn('Excedeu o número de requisições', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });
      return res.status(403).json({
        error: 'Forbidden',
        message,
      });
    }

    next();
  } catch (e) {
    console.error('Erro no middleware arcjet', e);
    res.status(500).json({
      error: 'internal Server Error',
      message: 'Algo deu errado no Middleware de Segurança do Arcjet',
    });
  }
};

export default securityMiddleware;
