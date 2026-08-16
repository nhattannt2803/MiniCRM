import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRouter from './routes/apiRoutes';
import { errorHandler } from './middleware/errorMiddleware';

dotenv.config();

const app = express();

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
const allowedOrigins = [process.env.CLIENT_URL || 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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
