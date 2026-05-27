import { SQLiteDatabase } from 'expo-sqlite';
import { Category, Transaction } from '@/database/db';
import { convertCurrency } from './currency';

export interface ParsedTransaction {
  type: 'expense' | 'income';
  amount: number;
  currency: string | null; // e.g. "USD", "CNY" (null if not specified)
  note: string;
  date: string; // YYYY-MM-DD
  matched_category_ids: number[];
}

export interface AiParseResult {
  success: boolean;
  transactions?: ParsedTransaction[];
  error?: string;
}

/**
 * Sends natural language text to the configured LLM to parse financial transaction details.
 */
export async function parseTransactionWithAi(
  db: SQLiteDatabase,
  text: string,
  categories: Category[],
  settings: {
    provider: string;
    apiKey: string;
    apiUrl: string;
    model: string;
    defaultCurrency: string;
  }
): Promise<AiParseResult> {
  if (!settings.apiKey) {
    return { success: false, error: 'settings.no_key_warning' };
  }

  const currentDate = new Date().toISOString().split('T')[0];
  const categoriesListStr = categories
    .map(c => `ID: ${c.id}, Name: "${c.name_key}" (Type: ${c.type}, Parent: ${c.parent_name_key || 'None'})`)
    .join('\n');

  const systemPrompt = `You are a smart financial bookkeeping assistant. Your task is to analyze the user's natural language input and extract bookkeeping entries (transactions).
Today's date is: ${currentDate}.
The user's default currency is: ${settings.defaultCurrency}.

Here is the list of available categories in the system:
${categoriesListStr}

Rules:
1. Identify if the transaction is an "expense" or "income".
2. Extract the amount. If the user specifies a currency (e.g. "10美元", "50 euros", "$100", "¥3000"), extract that currency code (e.g. USD, EUR, CNY). If no currency is specified, set "currency" to null.
3. Compute the date of the transaction in "YYYY-MM-DD" format. If the user mentions relative dates like "yesterday", "today", "last Monday", calculate it based on today's date (${currentDate}).
4. Extract or summarize a short note (description) for the transaction.
5. Select one or more appropriate category IDs from the list above that best fit the transaction and put them in "matched_category_ids". If multiple dimensions apply (e.g. eating out with friends -> Daily/Food and Flexible/Social), list both category IDs.
6. Return a strict JSON object with a single root key "transactions", which is an array of transaction objects.
7. Do not include any markdown styling, explanation or backticks in the response. Return ONLY valid JSON.

JSON Output Schema:
{
  "transactions": [
    {
      "type": "expense" | "income",
      "amount": number,
      "currency": string | null,
      "note": string,
      "date": "YYYY-MM-DD",
      "matched_category_ids": number[]
    }
  ]
}
`;

  try {
    const response = await fetch(`${settings.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
        response_format: settings.model.includes('gpt') ? { type: 'json_object' } : undefined
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API responded with ${response.status}: ${errText}`);
    }

    const resData = await response.json();
    const content = resData?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Empty response from LLM');
    }

    // Clean markdown code blocks if any
    let jsonStr = content;
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    const parsedJson = JSON.parse(jsonStr);
    if (!parsedJson.transactions || !Array.isArray(parsedJson.transactions)) {
      throw new Error('Invalid JSON structure: missing transactions array');
    }

    // Apply currency conversions if needed
    const processedTransactions: ParsedTransaction[] = [];
    for (const tx of parsedJson.transactions) {
      let finalAmount = tx.amount;
      
      // If transaction currency is specified and is different from global default currency, perform conversion
      if (tx.currency && tx.currency.toUpperCase() !== settings.defaultCurrency.toUpperCase()) {
        const conversion = await convertCurrency(db, tx.amount, tx.currency, settings.defaultCurrency);
        finalAmount = conversion.convertedAmount;
        tx.note = `${tx.note} (${tx.amount} ${tx.currency.toUpperCase()} @ rate ${conversion.rate})`;
      }

      processedTransactions.push({
        type: tx.type || 'expense',
        amount: finalAmount,
        currency: settings.defaultCurrency,
        note: tx.note || '',
        date: tx.date || currentDate,
        matched_category_ids: tx.matched_category_ids || []
      });
    }

    return {
      success: true,
      transactions: processedTransactions
    };
  } catch (error) {
    console.error('[AI Parser] Error parsing transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
