import express from 'express';
import { isSpoofedBot } from '@arcjet/inspect';
import logger from '#config/logger.js';
import aj from '#config/arcjet.js';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from '#routes/auth.routes.js';
import securityMiddleware from '#middleware/security.middleware.js';

const app = express();

app.use(helmet());
app.use(cors());

app.use(async (req, res, next) => {
  const decision = await aj.protect(req, { requested: 1 });

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return res.status(429).json({ error: 'Too Many Requests' });
    }
    if (decision.reason.isBot()) {
      return res.status(403).json({ error: 'No bots allowed' });
    }
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (decision.ip.isHosting() || decision.results.some(isSpoofedBot)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  morgan('combined', {
    stream: { write: message => logger.info(message.trim()) },
  })
);
app.use(securityMiddleware);

app.get('/', (req, res) => {
  logger.info('Hello World route accessed');
  res.status(200).send('Olá Mundo!');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({ message: 'Aquisitions API is running' });
});

app.use('/api/auth', authRouter);

export default app;
