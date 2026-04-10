import express from 'express';
import 'colors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import connectDB from './config/db.js';
import seedAdminUser from './scripts/seedAdminUser.js';
import seedTestData from './scripts/seedTestData.js';
import authRoutes from './routes/authRoute.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoute.js';
import testOrderRoutes from './routes/testOrderRoute.js';
import cors from 'cors';

// configure env
dotenv.config();

const app = express();
const allowedOrigins = new Set(
  (
    process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:6060',
      'http://host.docker.internal:6060',
    ]
  ).map((origin) => origin.trim()),
);

//middlewares
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    );
  }
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; script-src-elem 'self'; script-src-attr 'none'; style-src 'self' https://fonts.googleapis.com; style-src-elem 'self' https://fonts.googleapis.com; style-src-attr 'none'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self';",
  );
  next();
});

// Configure CORS with explicit allowed origins
const corsOptionsDelegate = (req, callback) => {
  const requestOrigin = req.header('Origin');
  const isAllowed = requestOrigin && allowedOrigins.has(requestOrigin);
  callback(null, {
    origin: isAllowed ? requestOrigin : false,
    credentials: Boolean(isAllowed),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
};
app.use(cors(corsOptionsDelegate));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.disable('x-powered-by');

//routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth', orderRoutes);
if (process.env.DEV_MODE === 'test') {
  app.use('/api/v1/auth', testOrderRoutes);
}
app.use('/api/v1/category', categoryRoutes);
app.use('/api/v1/product', productRoutes);

// rest api

app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send('<h1>Welcome to ecommerce app</h1>');
});

app.get('/robots.txt', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.type('text/plain').send('User-agent: *\nDisallow:\n');
});

app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res
    .type('application/xml')
    .send(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
    );
});

const PORT = process.env.PORT || 6060;
const shouldRunE2ESeed = process.env.E2E_SEED_ADMIN === 'true';
const shouldSeedTestData = process.env.E2E_SEED_TEST_DATA === 'true';

const startServer = async () => {
  try {
    await connectDB();
    if (shouldRunE2ESeed) {
      await seedAdminUser();
    }
    if (shouldSeedTestData) {
      await seedTestData();
    }
    app.listen(PORT, () => {
      console.log(
        `Server running on ${process.env.DEV_MODE} mode on ${PORT}`.bgCyan
          .white,
      );
    });
  } catch (error) {
    console.log(`Error starting server: ${error}`.bgRed.white);
    process.exit(1);
  }
};

startServer();
