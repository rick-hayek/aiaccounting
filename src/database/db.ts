import { type SQLiteDatabase } from 'expo-sqlite';
import * as Localization from 'expo-localization';

// --- Database Types ---

export interface Transaction {
  id: number;
  type: 'expense' | 'income';
  amount: number; // Stored in the default base currency
  date: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
  categories?: Category[]; // Populated when fetching
}

export interface Category {
  id: number;
  name_key: string; // Translation key (e.g. 'category.daily.food') or custom name
  type: 'expense' | 'income';
  icon: string | null;
  color: string | null;
  is_custom: number; // 0 = system, 1 = custom user category
  parent_id: number | null; // For hierarchical nesting
  parent_name_key?: string | null; // Joined name
}

export interface Budget {
  id: number;
  type: 'category' | 'month' | 'year';
  category_id: number | null;
  amount: number;
  period: string; // e.g., '2026-05' for monthly, '2026' for yearly
  warning_threshold: number; // e.g. 0.8 (80%)
}

export interface UserSetting {
  id: number;
  setting_key: string;
  setting_value: string;
}

// --- Migration & Schema Setup ---

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 2;
  
  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');
  
  let result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion < 1) {
    // 1. Create tables
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_key TEXT NOT NULL,
        type TEXT NOT NULL, -- 'expense' | 'income'
        icon TEXT,
        color TEXT,
        is_custom INTEGER DEFAULT 0, -- 0 = default, 1 = user custom
        parent_id INTEGER,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL, -- 'expense' | 'income'
        amount REAL NOT NULL,
        date TEXT NOT NULL, -- YYYY-MM-DD
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transaction_categories (
        transaction_id INTEGER,
        category_id INTEGER,
        PRIMARY KEY (transaction_id, category_id),
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER UNIQUE,
        amount REAL NOT NULL,
        period TEXT NOT NULL, -- e.g. YYYY-MM or YYYY
        warning_threshold REAL DEFAULT 0.8,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      );
    `);

    // 2. Seed Default Settings
    const systemLocales = Localization.getLocales();
    const isChinese = systemLocales.some(l => l.languageCode?.toLowerCase() === 'zh');
    const initialLang = isChinese ? 'zh' : 'en';
    const initialCurrency = isChinese ? 'CNY' : 'USD';

    await db.runAsync(
      `INSERT OR IGNORE INTO user_settings (setting_key, setting_value) VALUES (?, ?)`,
      'language', initialLang
    );
    await db.runAsync(
      `INSERT OR IGNORE INTO user_settings (setting_key, setting_value) VALUES (?, ?)`,
      'default_currency', initialCurrency
    );
    await db.runAsync(
      `INSERT OR IGNORE INTO user_settings (setting_key, setting_value) VALUES (?, ?)`,
      'ai_provider', 'openai'
    );
    await db.runAsync(
      `INSERT OR IGNORE INTO user_settings (setting_key, setting_value) VALUES (?, ?)`,
      'ai_api_key', ''
    );
    await db.runAsync(
      `INSERT OR IGNORE INTO user_settings (setting_key, setting_value) VALUES (?, ?)`,
      'ai_api_url', 'https://api.openai.com/v1'
    );
    await db.runAsync(
      `INSERT OR IGNORE INTO user_settings (setting_key, setting_value) VALUES (?, ?)`,
      'ai_model', 'gpt-4o-mini'
    );
    await db.runAsync(
      `INSERT OR IGNORE INTO user_settings (setting_key, setting_value) VALUES (?, ?)`,
      'theme_mode', 'system'
    );
    await db.runAsync(
      `INSERT OR IGNORE INTO user_settings (setting_key, setting_value) VALUES (?, ?)`,
      'theme_color', 'green'
    );

    // 3. Seed Root/Parent Categories
    // Expense Parents
    const parentDailyId = await insertCategoryRow(db, 'category.parent.daily', 'expense', 'card-outline', '#A5D6A7', null);
    const parentFixedId = await insertCategoryRow(db, 'category.parent.fixed', 'expense', 'home-outline', '#90CAF9', null);
    const parentFlexibleId = await insertCategoryRow(db, 'category.parent.flexible', 'expense', 'gift-outline', '#CE93D8', null);
    // Income Parent
    const parentIncomeId = await insertCategoryRow(db, 'category.parent.income', 'income', 'wallet-outline', '#FFE082', null);

    // Seed Child Categories
    // Daily Expenses children
    await insertCategoryRow(db, 'category.daily.food', 'expense', 'fast-food-outline', '#FFCDD2', parentDailyId);
    await insertCategoryRow(db, 'category.daily.transport', 'expense', 'car-outline', '#B3E5FC', parentDailyId);
    await insertCategoryRow(db, 'category.daily.necessities', 'expense', 'basket-outline', '#DCEDC8', parentDailyId);
    await insertCategoryRow(db, 'category.daily.entertainment', 'expense', 'play-outline', '#F8BBD0', parentDailyId);

    // Fixed Expenses children
    await insertCategoryRow(db, 'category.fixed.rent', 'expense', 'business-outline', '#D7CCC8', parentFixedId);
    await insertCategoryRow(db, 'category.fixed.property', 'expense', 'shield-checkmark-outline', '#CFD8DC', parentFixedId);
    await insertCategoryRow(db, 'category.fixed.utilities', 'expense', 'water-outline', '#B2EBF2', parentFixedId);
    await insertCategoryRow(db, 'category.fixed.digital', 'expense', 'phone-portrait-outline', '#C5CAE9', parentFixedId);
    await insertCategoryRow(db, 'category.fixed.appliances', 'expense', 'tv-outline', '#F5F5F5', parentFixedId);

    // Flexible Expenses children
    await insertCategoryRow(db, 'category.flexible.social', 'expense', 'people-outline', '#E1BEE7', parentFlexibleId);
    await insertCategoryRow(db, 'category.flexible.self_improvement', 'expense', 'book-outline', '#B2DFDB', parentFlexibleId);
    await insertCategoryRow(db, 'category.flexible.clothing', 'expense', 'shirt-outline', '#FFCC80', parentFlexibleId);
    await insertCategoryRow(db, 'category.flexible.travel', 'expense', 'airplane-outline', '#FFF9C4', parentFlexibleId);

    // Income children
    await insertCategoryRow(db, 'category.income.salary', 'income', 'cash-outline', '#C8E6C9', parentIncomeId);
    await insertCategoryRow(db, 'category.income.finance', 'income', 'trending-up-outline', '#B2DFDB', parentIncomeId);
    await insertCategoryRow(db, 'category.income.windfall', 'income', 'gift-outline', '#FFF9C4', parentIncomeId);

    currentDbVersion = 1;
  }

  if (currentDbVersion < 2) {
    // Seed new theme settings for existing users
    await db.runAsync(
      `INSERT OR IGNORE INTO user_settings (setting_key, setting_value) VALUES (?, ?)`,
      'theme_mode', 'system'
    );
    await db.runAsync(
      `INSERT OR IGNORE INTO user_settings (setting_key, setting_value) VALUES (?, ?)`,
      'theme_color', 'green'
    );

    // Update existing default category colors to pastels
    await db.execAsync(`
      UPDATE categories SET color = '#A5D6A7' WHERE name_key = 'category.parent.daily';
      UPDATE categories SET color = '#90CAF9' WHERE name_key = 'category.parent.fixed';
      UPDATE categories SET color = '#CE93D8' WHERE name_key = 'category.parent.flexible';
      UPDATE categories SET color = '#FFE082' WHERE name_key = 'category.parent.income';
      
      UPDATE categories SET color = '#FFCDD2' WHERE name_key = 'category.daily.food';
      UPDATE categories SET color = '#B3E5FC' WHERE name_key = 'category.daily.transport';
      UPDATE categories SET color = '#DCEDC8' WHERE name_key = 'category.daily.necessities';
      UPDATE categories SET color = '#F8BBD0' WHERE name_key = 'category.daily.entertainment';
      
      UPDATE categories SET color = '#D7CCC8' WHERE name_key = 'category.fixed.rent';
      UPDATE categories SET color = '#CFD8DC' WHERE name_key = 'category.fixed.property';
      UPDATE categories SET color = '#B2EBF2' WHERE name_key = 'category.fixed.utilities';
      UPDATE categories SET color = '#C5CAE9' WHERE name_key = 'category.fixed.digital';
      UPDATE categories SET color = '#F5F5F5' WHERE name_key = 'category.fixed.appliances';
      
      UPDATE categories SET color = '#E1BEE7' WHERE name_key = 'category.flexible.social';
      UPDATE categories SET color = '#B2DFDB' WHERE name_key = 'category.flexible.self_improvement';
      UPDATE categories SET color = '#FFCC80' WHERE name_key = 'category.flexible.clothing';
      UPDATE categories SET color = '#FFF9C4' WHERE name_key = 'category.flexible.travel';
      
      UPDATE categories SET color = '#C8E6C9' WHERE name_key = 'category.income.salary';
      UPDATE categories SET color = '#B2DFDB' WHERE name_key = 'category.income.finance';
      UPDATE categories SET color = '#FFF9C4' WHERE name_key = 'category.income.windfall';
    `);

    currentDbVersion = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

async function insertCategoryRow(
  db: SQLiteDatabase,
  nameKey: string,
  type: 'expense' | 'income',
  icon: string,
  color: string,
  parentId: number | null
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO categories (name_key, type, icon, color, is_custom, parent_id) VALUES (?, ?, ?, ?, 0, ?)`,
    nameKey, type, icon, color, parentId
  );
  return result.lastInsertRowId;
}

// --- Database Operations ---

// 1. Transaction Operations
export async function getTransactions(db: SQLiteDatabase, limit = 100, offset = 0): Promise<Transaction[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT t.* FROM transactions t ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?`,
    limit, offset
  );

  const transactions: Transaction[] = [];

  for (const row of rows) {
    const tx: Transaction = {
      id: row.id,
      type: row.type,
      amount: row.amount,
      date: row.date,
      note: row.note,
      created_at: row.created_at,
      categories: []
    };

    // Load categories for this transaction
    const catRows = await db.getAllAsync<any>(
      `SELECT c.*, p.name_key as parent_name_key 
       FROM categories c 
       INNER JOIN transaction_categories tc ON tc.category_id = c.id 
       LEFT JOIN categories p ON c.parent_id = p.id
       WHERE tc.transaction_id = ?`,
      row.id
    );

    tx.categories = catRows.map(c => ({
      id: c.id,
      name_key: c.name_key,
      type: c.type,
      icon: c.icon,
      color: c.color,
      is_custom: c.is_custom,
      parent_id: c.parent_id,
      parent_name_key: c.parent_name_key
    }));

    transactions.push(tx);
  }

  return transactions;
}

export async function addTransaction(
  db: SQLiteDatabase,
  type: 'expense' | 'income',
  amount: number,
  date: string,
  note: string | null,
  categoryIds: number[]
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO transactions (type, amount, date, note) VALUES (?, ?, ?, ?)`,
    type, amount, date, note
  );
  const transactionId = result.lastInsertRowId;

  // Insert links
  for (const catId of categoryIds) {
    await db.runAsync(
      `INSERT INTO transaction_categories (transaction_id, category_id) VALUES (?, ?)`,
      transactionId, catId
    );
  }

  return transactionId;
}

export async function updateTransaction(
  db: SQLiteDatabase,
  id: number,
  type: 'expense' | 'income',
  amount: number,
  date: string,
  note: string | null,
  categoryIds: number[]
): Promise<void> {
  await db.runAsync(
    `UPDATE transactions SET type = ?, amount = ?, date = ?, note = ? WHERE id = ?`,
    type, amount, date, note, id
  );

  // Clear existing category relations
  await db.runAsync(`DELETE FROM transaction_categories WHERE transaction_id = ?`, id);

  // Insert new links
  for (const catId of categoryIds) {
    await db.runAsync(
      `INSERT INTO transaction_categories (transaction_id, category_id) VALUES (?, ?)`,
      id, catId
    );
  }
}

export async function deleteTransaction(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM transactions WHERE id = ?`, id);
}

// 2. Category Operations
export async function getCategories(db: SQLiteDatabase): Promise<Category[]> {
  return await db.getAllAsync<Category>(
    `SELECT c.*, p.name_key as parent_name_key 
     FROM categories c 
     LEFT JOIN categories p ON c.parent_id = p.id
     ORDER BY c.parent_id IS NULL DESC, c.parent_id ASC, c.id ASC`
  );
}

export async function addCategory(
  db: SQLiteDatabase,
  nameKey: string,
  type: 'expense' | 'income',
  icon: string | null,
  color: string | null,
  parentId: number | null
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO categories (name_key, type, icon, color, is_custom, parent_id) VALUES (?, ?, ?, ?, 1, ?)`,
    nameKey, type, icon, color, parentId
  );
  return result.lastInsertRowId;
}

export async function deleteCategory(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM categories WHERE id = ?`, id);
}

// 3. User Settings Operations
export async function getSettings(db: SQLiteDatabase): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ setting_key: string; setting_value: string }>(
    `SELECT setting_key, setting_value FROM user_settings`
  );
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.setting_key] = row.setting_value;
  }
  return settings;
}

export async function updateSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO user_settings (setting_key, setting_value) VALUES (?, ?)
     ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value`,
    key, value
  );
}

// 4. Budget Operations
export async function getBudgets(db: SQLiteDatabase): Promise<Budget[]> {
  return await db.getAllAsync<Budget>(`SELECT * FROM budgets`);
}

export async function addOrUpdateBudget(
  db: SQLiteDatabase,
  type: 'category' | 'month' | 'year',
  categoryId: number | null,
  amount: number,
  period: string,
  warningThreshold = 0.8
): Promise<void> {
  // Query if budget exists for this period and target
  let existing: any;
  if (type === 'category') {
    existing = await db.getFirstAsync(
      `SELECT id FROM budgets WHERE type = 'category' AND category_id = ? AND period = ?`,
      categoryId, period
    );
  } else {
    existing = await db.getFirstAsync(
      `SELECT id FROM budgets WHERE type = ? AND period = ? AND category_id IS NULL`,
      type, period
    );
  }

  if (existing) {
    await db.runAsync(
      `UPDATE budgets SET amount = ?, warning_threshold = ? WHERE id = ?`,
      amount, warningThreshold, existing.id
    );
  } else {
    await db.runAsync(
      `INSERT INTO budgets (type, category_id, amount, period, warning_threshold) VALUES (?, ?, ?, ?, ?)`,
      type, categoryId, amount, period, warningThreshold
    );
  }
}

export async function deleteBudget(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM budgets WHERE id = ?`, id);
}

// 5. High-level Statistics Queries
export interface CategorySpending {
  categoryId: number;
  categoryNameKey: string;
  parentNameKey: string | null;
  amount: number;
  color: string | null;
}

export async function getSpendingByCategory(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<CategorySpending[]> {
  // Since one transaction can belong to multiple categories,
  // we count the amount for each category (which may lead to a total > actual spent, but is exactly what the user wanted: multi-dimensional review).
  return await db.getAllAsync<CategorySpending>(
    `SELECT c.id as categoryId, c.name_key as categoryNameKey, p.name_key as parentNameKey, SUM(t.amount) as amount, c.color
     FROM transactions t
     INNER JOIN transaction_categories tc ON tc.transaction_id = t.id
     INNER JOIN categories c ON tc.category_id = c.id
     LEFT JOIN categories p ON c.parent_id = p.id
     WHERE t.type = 'expense' AND t.date >= ? AND t.date <= ?
     GROUP BY c.id
     ORDER BY amount DESC`,
    startDate, endDate
  );
}

export async function getSumByPeriod(
  db: SQLiteDatabase,
  type: 'expense' | 'income',
  startDate: string,
  endDate: string
): Promise<number> {
  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT SUM(amount) as total FROM transactions WHERE type = ? AND date >= ? AND date <= ?`,
    type, startDate, endDate
  );
  return result?.total ?? 0;
}
