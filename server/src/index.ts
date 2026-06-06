import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import recipeRoutes from './routes/recipes.js';
import listRoutes from './routes/lists.js';
import './db/database.js';

const app = express();
const PORT = process.env.PORT ?? 3001;
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = [
      CLIENT_URL,
      /^https:\/\/krino-client.*\.vercel\.app$/,
    ];
    const ok = allowed.some((p) =>
      typeof p === 'string' ? p === origin : p.test(origin)
    );
    callback(ok ? null : new Error('CORS geblokkeerd'), ok);
  },
  credentials: true,
}));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? 'krino-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/lists', listRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Krino server draait op http://localhost:${PORT}`);
});
