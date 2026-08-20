import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRouter from './routes/apiRoutes';
import { errorHandler } from './middleware/errorMiddleware';

dotenv.config();

const app = express();

// Enable trust proxy when behind Nginx / reverse proxy (for rate limiting and client IP extraction)
app.set('trust proxy', 1);

// Security HTTP headers - Allow iframe embedding from external domains
app.use(
  helmet({
    frameguard: false, // Disables X-Frame-Options header
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'frame-ancestors': ['*'], // Allows embedding in iframe on any domain
      },
    },
  })
);

// CORS configuration
const rawClientUrls = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = rawClientUrls
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed === '*') return true;
      if (allowed === cleanOrigin) return true;
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS Warning] Origin "${origin}" is not allowed. Configured CLIENT_URL: "${rawClientUrls}"`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
