import { type SQLiteDatabase } from 'expo-sqlite';
import { updateSetting } from '@/database/db';

const API_URL = 'https://open.er-api.com/v6/latest';

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  time_last_update_utc: string;
}

/**
 * Fetches the latest exchange rates for a given base currency.
 * Attempts to load from API. If it fails, falls back to the database cache.
 */
export async function getExchangeRates(
  db: SQLiteDatabase,
  baseCurrency: string
): Promise<Record<string, number> | null> {
  const cacheKey = `rates_${baseCurrency.toUpperCase()}`;
  const timestampKey = `rates_updated_${baseCurrency.toUpperCase()}`;

  try {
    const response = await fetch(`${API_URL}/${baseCurrency.toUpperCase()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.status}`);
    }
    const data: ExchangeRates = await response.json();
    
    if (data && data.rates) {
      // Save cache to database
      await updateSetting(db, cacheKey, JSON.stringify(data.rates));
      await updateSetting(db, timestampKey, new Date().toISOString());
      return data.rates;
    }
  } catch (error) {
    console.warn(`[Currency API] Failed to fetch live rates, loading from cache:`, error);
  }

  // Fallback to cache
  try {
    const settings = await db.getAllAsync<{ setting_key: string; setting_value: string }>(
      `SELECT setting_key, setting_value FROM user_settings WHERE setting_key IN (?, ?)`,
      cacheKey, timestampKey
    );
    
    const cacheVal = settings.find(s => s.setting_key === cacheKey)?.setting_value;
    if (cacheVal) {
      return JSON.parse(cacheVal);
    }
  } catch (cacheError) {
    console.error(`[Currency API] Failed to read rates cache from database:`, cacheError);
  }

  return null;
}

/**
 * Converts an amount from one currency to another using the database to load/save rates.
 */
export async function convertCurrency(
  db: SQLiteDatabase,
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{ convertedAmount: number; rate: number }> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) {
    return { convertedAmount: amount, rate: 1.0 };
  }

  // Fetch rates for base = from
  const rates = await getExchangeRates(db, from);
  if (rates && rates[to]) {
    const rate = rates[to];
    return {
      convertedAmount: Number((amount * rate).toFixed(2)),
      rate
    };
  }

  // If that fails, try fetching rates for base = to and invert it
  const reverseRates = await getExchangeRates(db, to);
  if (reverseRates && reverseRates[from]) {
    const rate = 1 / reverseRates[from];
    return {
      convertedAmount: Number((amount * rate).toFixed(2)),
      rate
    };
  }

  // Fallback default mock rates if completely offline and no cache
  const defaultRates: Record<string, Record<string, number>> = {
    USD: { CNY: 7.24, EUR: 0.92, GBP: 0.79 },
    CNY: { USD: 0.14, EUR: 0.13, GBP: 0.11 }
  };

  const defaultRate = defaultRates[from]?.[to] ?? (1 / (defaultRates[to]?.[from] ?? 1));
  console.warn(`[Currency API] Using fallback default rate for ${from} to ${to}: ${defaultRate}`);
  return {
    convertedAmount: Number((amount * defaultRate).toFixed(2)),
    rate: defaultRate
  };
}

/**
 * Gets currency symbol based on currency code.
 */
export function getCurrencySymbol(code: string): string {
  switch (code.toUpperCase()) {
    case 'CNY':
      return '¥';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'JPY':
      return '¥';
    default:
      return code;
  }
}
