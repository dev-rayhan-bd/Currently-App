import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import router from './app/routes/index';
import globalErrorHandler from './app/middleware/globalErrorHandler';
import notFound from './app/middleware/notFound';
import morgan from 'morgan';
// import { stripeWebhookHandler } from './app/webhook/webhook.stripe';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
const app: Application = express();



// --- HIGH SECURITY MIDDLEWARES ---
app.use(helmet()); // HTTP headers security
app.use(mongoSanitize()); // NoSQL injection protection (e.g: email: {"$gt": ""})

// --- RATE LIMITING ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, //14 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, 
  legacyHeaders: false, 
});
app.use('/api', limiter); 

app.use(express.json({ limit: '10kb' })); // bosy size limnit 10kb, to prevent DoS attacks

// Now apply JSON parser for all other routes
app.use(express.json());
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(
  cors({
    origin: [
      'http://10.10.20.13:5000',
      'http://10.10.20.13:3000',
      'http://localhost:5175',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'https://el-afrik.vercel.app',
      'http://15.223.245.199',
      'http://15.223.245.199:3000',
    'https://currently-dashboard.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  })
);

// Stripe needs raw body for signature verification
// app.post(
//   '/webhook/stripe',
//   express.raw({ type: 'application/json' }),
//   stripeWebhookHandler
// );




app.use(morgan('dev'));
app.use('/api/v1', router);

app.get('/', (req: Request, res: Response) => {
  res.send('Currently API - Server is Breathing...');
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;