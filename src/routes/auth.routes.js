import express from 'express';
import { signup, signin, signout } from '#controllers/auth.controller.js';

const authRouter = express.Router();

authRouter.post('/sign-up', signup);
authRouter.post('/sign-in', signin);
authRouter.post('/sign-out', signout);

export default authRouter;
