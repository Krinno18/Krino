import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import recipeRoutes from './routes/recipes.js';
import listRoutes from './routes/lists.js';
import axios from 'axios';
import { getAnonymousToken } from './services/ahAuth.js';
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

app.get('/api/debug/ah-bonus', async (_, res) => {
  const params = [
    { sortOn: 'OFFERS', size: 3 },
    { sortOn: 'OFFERS', size: 3, taxonomyId: 'bonus' },
    { query: '*', sortOn: 'OFFERS', size: 3 },
    { bonus: true, size: 3 },
  ];
  const results: any[] = [];
  try {
    const token = await getAnonymousToken();
    for (const p of params) {
      try {
        const r = await axios.get('https://api.ah.nl/mobile-services/product/search/v2', {
          params: p,
          headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Appie/8.22.3', 'X-Application': 'AHWEBSHOP' },
        });
        results.push({ params: p, ok: true, total: r.data.page?.totalElements, firstTitle: r.data.products?.[0]?.title });
      } catch (e: any) {
        results.push({ params: p, ok: false, status: e.response?.status });
      }
    }
    res.json(results);
  } catch (err: any) {
    res.json({ error: err.message });
  }
});

app.get('/api/debug/ah-product-full', async (_, res) => {
  try {
    const token = await getAnonymousToken();
    const response = await axios.get('https://api.ah.nl/mobile-services/product/search/v2', {
      params: { query: 'brood', page: 0, size: 1 },
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Appie/8.22.3', 'X-Application': 'AHWEBSHOP' },
    });
    res.json(response.data.products?.[0] ?? {});
  } catch (err: any) {
    res.json({ error: err.message, status: err.response?.status, data: err.response?.data });
  }
});

app.get('/api/debug/ah-recipes', async (_, res) => {
  const endpoints = [
    'https://api.ah.nl/gatekeeper/recipe/v1/recipe-suggestions',
    'https://api.ah.nl/mobile-services/recipe/v2/recipe-suggestions',
    'https://api.ah.nl/gatekeeper/recipe/v2/recipe-suggestions',
    'https://api.ah.nl/mobile-services/v1/recipe/search',
    'https://api.ah.nl/mobile-services/recipe/v1/search',
    'https://api.ah.nl/allerhande/recipe/v1/recipes',
    'https://api.ah.nl/gatekeeper/recipe/v1/recipes',
    'https://api.ah.nl/mobile-services/v1/recipes',
    'https://api.ah.nl/mobile-services/recipe/search/v1',
    'https://api.ah.nl/mobile-services/recipe/search/v2',
    'https://api.ah.nl/mobile-services/recipe/v1/recipe-suggestions',
    'https://api.ah.nl/mobile-services/v2/recipe/search',
    'https://api.ah.nl/mobile-services/v1/recipe-suggestions',
  ];
  const results: Record<string, any> = {};
  try {
    const token = await getAnonymousToken();
    for (const url of endpoints) {
      try {
        const r = await axios.get(url, {
          params: { query: 'pasta', size: 1 },
          headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Appie/8.22.3', 'X-Application': 'AHWEBSHOP' },
        });
        results[url] = { ok: true, keys: Object.keys(r.data), sample: JSON.stringify(r.data).substring(0, 400) };
      } catch (e: any) {
        results[url] = { ok: false, status: e.response?.status, error: e.message };
      }
    }
    res.json(results);
  } catch (err: any) {
    res.json({ error: err.message });
  }
});

app.get('/api/debug/ah-search', async (_, res) => {
  try {
    const token = await getAnonymousToken();
    const response = await axios.get('https://api.ah.nl/mobile-services/product/search/v2', {
      params: { query: 'brood', page: 0, size: 3 },
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Appie/8.22.3',
        'X-Application': 'AHWEBSHOP',
      },
    });
    res.json({ success: true, keys: Object.keys(response.data), sample: JSON.stringify(response.data).substring(0, 500) });
  } catch (err: any) {
    res.json({ success: false, message: err.message, ahStatus: err.response?.status, ahData: err.response?.data });
  }
});

app.get('/api/debug/ah-token', async (_, res) => {
  try {
    const token = await getAnonymousToken();
    res.json({ success: true, token: token.substring(0, 30) + '...' });
  } catch (err: any) {
    res.json({
      success: false,
      message: err.message,
      ahStatus: err.response?.status,
      ahData: err.response?.data,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Krino server draait op http://localhost:${PORT}`);
});
