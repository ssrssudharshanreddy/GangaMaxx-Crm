import express from 'express';
import cors from 'cors';
import { apiLimiter } from './middlewares/rateLimit.js';
import { errorHandler } from './middlewares/error.js';
import apiRouter from './routes/api.js';
import adminApiRouter from './routes/adminApi.js';

const app = express();

app.use(cors({
  origin: '*', // Adjust this for production to only allow Frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiLimiter, apiRouter);
app.use('/api', apiLimiter, adminApiRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
