import Papa from 'papaparse';
import type { SpendingLog, Person, Currency } from '../types';

/**
 * Export logs and currencies to CSV.
 * Metadata line: `#currencies: code1,rate1; code2,rate2; ...`
 * Log columns: item, amount, currency, paidBy, channel, involved, shares
 * - paidBy and involved: stored as person names
 * - shares: stored as JSON object with person names as keys
 */
export function exportLogsToCSV(
  logs: SpendingLog[],
  people: Person[],
  currencies: Currency[]
): string {
  // Safeguard: ensure currencies is always an array
  if (!currencies || !Array.isArray(currencies) || currencies.length === 0) {
    console.warn('Currencies undefined or empty, defaulting to HKD');
    currencies = [{ code: 'HKD', rateToHKD: 1 }];
  }

  const currencyDefs = currencies
    .map(c => `${c.code},${c.rateToHKD}`)
    .join(';');
  const metaLine = `#currencies: ${currencyDefs}`;

  // Build log rows
  const rows = logs.map(log => {
    let sharesStr = '';
    if (log.shares) {
      const sharesByName: Record<string, number> = {};
      for (const [id, amount] of Object.entries(log.shares)) {
        const name = people.find(p => p.id === id)?.name || id;
        sharesByName[name] = amount;
      }
      sharesStr = JSON.stringify(sharesByName);
    }
    return {
      item: log.item,
      amount: log.amount.toString(),
      currency: log.currency,
      paidBy: people.find(p => p.id === log.paidBy)?.name || log.paidBy,
      channel: log.channel,
      involved: log.involved.length === 0
        ? 'all'
        : log.involved.map(id => people.find(p => p.id === id)?.name || id).join(', '),
      shares: sharesStr,
    };
  });

  const dataCSV = Papa.unparse(rows);
  return metaLine + '\n\n' + dataCSV;
}

/**
 * Import logs, people and currencies from CSV.
 * Expects optional metadata line: `#currencies: code1,rate1; code2,rate2; ...`
 * Log columns: item, amount, currency, paidBy, channel, involved, shares
 * - paidBy and involved: person names (will be created if missing)
 * - shares: JSON object with person names as keys
 */
export function importLogsFromCSV(
  csvString: string,
  existingPeople: Person[],
  existingCurrencies: Currency[]
): {
  logs: Omit<SpendingLog, 'id'>[];
  people: Person[];
  currencies: Currency[];
} {
  // ----- 1. Safeguard inputs -----
  const safePeople = Array.isArray(existingPeople) ? existingPeople : [];
  const safeCurrencies = Array.isArray(existingCurrencies) && existingCurrencies.length > 0
    ? existingCurrencies
    : [{ code: 'HKD', rateToHKD: 1 }];

  // ----- 2. Split lines and find metadata -----
  const lines = csvString.split(/\r?\n/);
  let metaLine = '';
  let dataLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#currencies:')) {
      metaLine = line;
    } else if (line) {
      // If no metadata found, treat everything as data
      if (!metaLine && i === 0) {
        dataLines = lines;
        break;
      } else if (metaLine && i > 0 && line) {
        // After metadata, take all remaining non‑empty lines
        dataLines = lines.slice(i);
        break;
      }
    }
  }
  // Fallback: if no data lines were captured, use all lines
  if (dataLines.length === 0 && !metaLine) {
    dataLines = lines;
  }

  // ----- 3. Parse currencies from metadata -----
  let currencies: Currency[] = [...safeCurrencies];
  if (metaLine) {
    const parts = metaLine.replace('#currencies:', '').trim();
    if (parts) {
      const defs = parts.split(';').map(s => s.trim()).filter(Boolean);
      const newCurrencies: Currency[] = [];
      for (const def of defs) {
        const [code, rate] = def.split(',').map(s => s.trim());
        if (code && rate && !isNaN(parseFloat(rate))) {
          const rateNum = parseFloat(rate);
          const existingIdx = newCurrencies.findIndex(c => c.code === code);
          if (existingIdx >= 0) {
            newCurrencies[existingIdx] = { code, rateToHKD: rateNum };
          } else {
            newCurrencies.push({ code, rateToHKD: rateNum });
          }
        }
      }
      // Merge: new currencies override existing ones with same code
      const merged = [...safeCurrencies];
      for (const nc of newCurrencies) {
        const idx = merged.findIndex(c => c.code === nc.code);
        if (idx >= 0) {
          merged[idx] = nc;
        } else {
          merged.push(nc);
        }
      }
      currencies = merged;
    }
  }

  // ----- 4. Parse data with Papa -----
  const dataCSV = dataLines.join('\n');
  const result = Papa.parse<any>(dataCSV, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => {
      let key = h.trim().toLowerCase().replace(/[\s\-_]/g, '');
      if (key === 'paidby' || key === 'payer') key = 'paidBy';
      if (key === 'itemname' || key === 'description') key = 'item';
      if (key === 'paymentchannel' || key === 'channel') key = 'channel';
      if (key === 'involved' || key === 'participants') key = 'involved';
      return key;
    }
  });

  // Filter rows that have at least an item and an amount
  const rows = result.data.filter((row: any) =>
    row.item && row.item.trim() && row.amount && !isNaN(parseFloat(row.amount))
  );

  // ----- 5. Build people and logs -----
  const newPeople: Person[] = [...safePeople];
  const logs: Omit<SpendingLog, 'id'>[] = [];

  for (const row of rows) {
    const paidByName = (row.paidBy || '').trim();
    if (!paidByName) continue; // skip if payer missing

    // Resolve or create payer
    let paidByPerson = newPeople.find(p => p.name === paidByName);
    if (!paidByPerson) {
      paidByPerson = { id: crypto.randomUUID(), name: paidByName };
      newPeople.push(paidByPerson);
    }

    // Resolve involved
    const involvedRaw = (row.involved || '').trim();
    let involvedIds: string[] = [];
    if (involvedRaw.toLowerCase() !== 'all' && involvedRaw) {
      const names = involvedRaw.split(',').map(s => s.trim()).filter(Boolean);
      for (const name of names) {
        let person = newPeople.find(p => p.name === name);
        if (!person) {
          person = { id: crypto.randomUUID(), name };
          newPeople.push(person);
        }
        involvedIds.push(person.id);
      }
    }

    // Parse shares – expected as JSON with person names as keys
    let shares: Record<string, number> | undefined;
    if (row.shares) {
      try {
        const parsed = JSON.parse(row.shares);
        // parsed is { [name]: number }
        shares = {};
        for (const [name, amount] of Object.entries(parsed)) {
          // Find or create person for each name in shares
          let person = newPeople.find(p => p.name === name);
          if (!person) {
            person = { id: crypto.randomUUID(), name };
            newPeople.push(person);
          }
          shares[person.id] = amount as number;
        }
      } catch {
        // malformed shares – ignore
      }
    }

    logs.push({
      item: row.item.trim(),
      amount: parseFloat(row.amount),
      currency: (row.currency || 'HKD').trim() || 'HKD',
      paidBy: paidByPerson.id,
      channel: (row.channel || '').trim(),
      involved: involvedIds,
      shares,
    });
  }

  return { logs, people: newPeople, currencies };
}