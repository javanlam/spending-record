import type { SpendingLog, Person, Currency, Settlement } from '../types';

export function computeSettlement(
  logs: SpendingLog[],
  people: Person[],
  currencies: Currency[]
): Settlement[] {
  // Build rate map
  const rateMap: Record<string, number> = { HKD: 1 };
  currencies.forEach(c => { rateMap[c.code] = c.rateToHKD; });

  // We will group balances by the set of involved people
  // The key is a sorted, comma-separated list of IDs
  const groupBalances: Record<string, Record<string, number>> = {};

  for (const log of logs) {
    // Determine the actual involved set = {paidBy} ∪ {involved}
    const involvedSet = new Set<string>();
    involvedSet.add(log.paidBy);
    if (log.involved.length === 0) {
      people.forEach(p => involvedSet.add(p.id));
    } else {
      log.involved.forEach(id => involvedSet.add(id));
    }

    // Filter to only known people (avoid silent corruption)
    const validIds = Array.from(involvedSet).filter(id => 
      people.some(p => p.id === id)
    );
    if (validIds.length === 0) continue; // skip invalid logs

    // Create a stable group key
    const groupKey = validIds.slice().sort().join(',');

    // Ensure this group has a balance record
    if (!groupBalances[groupKey]) {
      groupBalances[groupKey] = {};
      validIds.forEach(id => groupBalances[groupKey][id] = 0);
    }

    const balance = groupBalances[groupKey];
    const rate = rateMap[log.currency] || 1;
    const amountHKD = log.amount * rate;

    // Credit the payer
    balance[log.paidBy] = (balance[log.paidBy] || 0) + amountHKD;

    // Determine shares (convert custom shares to HKD if needed)
    let shares: Record<string, number>;
    if (log.shares) {
      // Shares are in the item's original currency – convert to HKD
      shares = {};
      for (const id of validIds) {
        const shareInOriginal = log.shares[id] || 0;
        shares[id] = shareInOriginal * rate;
      }
    } else {
      // Equal split – amountHKD is already in HKD
      const share = amountHKD / validIds.length;
      shares = Object.fromEntries(validIds.map(id => [id, share]));
    }

    // Deduct shares from each involved person
    for (const id of validIds) {
      const share = shares[id] || 0;
      balance[id] = (balance[id] || 0) - share;
    }
  }

  // Now, settle each group independently
  const allSettlements: Settlement[] = [];

  for (const groupKey of Object.keys(groupBalances)) {
    const balance = groupBalances[groupKey];
    const ids = groupKey.split(',');

    // Separate debtors and creditors within this group
    const debtors = ids
      .map(id => ({ id, balance: balance[id] || 0 }))
      .filter(item => item.balance < -0.01)
      .sort((a, b) => a.balance - b.balance);

    const creditors = ids
      .map(id => ({ id, balance: balance[id] || 0 }))
      .filter(item => item.balance > 0.01)
      .sort((a, b) => b.balance - a.balance);

    // Greedy settlement within this group only
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(-debtor.balance, creditor.balance);
      allSettlements.push({ from: debtor.id, to: creditor.id, amount });
      debtor.balance += amount;
      creditor.balance -= amount;
      if (Math.abs(debtor.balance) < 0.01) i++;
      if (Math.abs(creditor.balance) < 0.01) j++;
    }
  }

  const combinedMap = new Map<string, number>(); // key: "from|to"
  for (const s of allSettlements) {
    const key = `${s.from}|${s.to}`;
    combinedMap.set(key, (combinedMap.get(key) || 0) + s.amount);
  }

  // Convert back to Settlement[], filtering out tiny remainders
  const finalSettlements: Settlement[] = [];
  for (const [key, amount] of combinedMap) {
    if (Math.abs(amount) > 0.01) {
      const [from, to] = key.split('|');
      finalSettlements.push({ from, to, amount });
    }
  }

  return finalSettlements;
}