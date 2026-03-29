import express, { Request, Response } from 'express';
import { requireAuth } from '../auth';
import { asyncHandler } from '../middleware/security';

const router = express.Router();

let cachedRates: any = null;
let lastFetch: number = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

async function getRates() {
  const now = Date.now();
  if (cachedRates && (now - lastFetch < CACHE_DURATION)) {
    return cachedRates;
  }

  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    if (data && data.rates) {
      cachedRates = data.rates;
      lastFetch = now;
      return cachedRates;
    }
    return cachedRates || { USD: 1 }; // Fallback to last known or default
  } catch (err) {
    console.error('Failed to fetch exchange rates:', err);
    return cachedRates || { USD: 1 };
  }
}

router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const rates = await getRates();
  res.json({ rates, lastUpdate: lastFetch });
}));

export default router;
