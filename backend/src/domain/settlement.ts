import { netBalances } from './balances.ts';
import { splitByOccupancy, splitEqual } from './money.ts';
import type { Bill, Expense, Id, IsoDate, Member, Paise } from './model.ts';

export type BillEstimate = { bill: Bill; share: Paise };

export type MoveOutSettlement = {
  memberId: Id;
  moveOut: IsoDate;
  /** Current expense balance (paid − owed). */
  balance: Paise;
  /** Their occupancy share of bills that are still pending. */
  estimates: BillEstimate[];
  /** Their deposit share, refunded by the people staying. */
  deposit: Paise;
  /** Positive = flat pays them, negative = they pay the flat. */
  final: Paise;
};

const withMoveOut = (members: Member[], id: Id, date: IsoDate) =>
  members.map(m => (m.id === id ? { ...m, moveOut: date } : m));

export const isActiveOn = (m: Member, date: IsoDate) =>
  m.moveIn <= date && (!m.moveOut || m.moveOut >= date);

/**
 * Final settlement for a member leaving on `moveOut`. Includes estimated shares
 * of pending bills (e.g. electricity arriving after they leave), pro-rated by
 * the days they lived there during each bill period.
 */
export function moveOutSettlement(
  memberId: Id,
  moveOut: IsoDate,
  members: Member[],
  expenses: Expense[],
  bills: Bill[],
): MoveOutSettlement {
  const ms = withMoveOut(members, memberId, moveOut);
  const balance =
    netBalances(
      expenses,
      ms.map(m => m.id),
    )[memberId] ?? 0;
  const estimates = bills
    .filter(b => b.status === 'pending')
    .map(bill => ({
      bill,
      share:
        splitByOccupancy(bill.amount, ms, bill.periodStart, bill.periodEnd)[
          memberId
        ] ?? 0,
    }))
    .filter(e => e.share > 0);
  const deposit = members.find(m => m.id === memberId)?.deposit ?? 0;
  const final = balance - estimates.reduce((s, e) => s + e.share, 0) + deposit;
  return { memberId, moveOut, balance, estimates, deposit, final };
}

/**
 * Books the settlement payout between the leaver and the members who stay.
 * Afterwards the leaver's balance equals their pending-bill estimates, so when
 * those bills are paid at real amounts the difference is the reconciliation.
 */
export function settlementExpense(
  s: MoveOutSettlement,
  stayingIds: Id[],
  id: Id,
): Expense | null {
  if (s.final === 0 || stayingIds.length === 0) return null;
  const amount = Math.abs(s.final);
  const leaver = { [s.memberId]: amount };
  const others = splitEqual(amount, stayingIds);
  return {
    id,
    title: 'Move-out settlement',
    category: 'Settlement',
    amount,
    date: s.moveOut,
    // Flat pays leaver: stayers "paid", leaver's share consumed — and vice versa.
    paid: s.final > 0 ? others : leaver,
    owed: s.final > 0 ? leaver : others,
  };
}

/**
 * The people staying take over the leaver's deposit share: the leaver is credited
 * with it and the stayers charged, so the settlement payout clears it.
 */
export function depositBuyout(s: MoveOutSettlement, stayingIds: Id[], id: Id): Expense | null {
  if (s.deposit === 0 || stayingIds.length === 0) return null;
  return {
    id,
    title: 'Deposit buy-out',
    category: 'Settlement',
    amount: s.deposit,
    date: s.moveOut,
    paid: { [s.memberId]: s.deposit },
    owed: splitEqual(s.deposit, stayingIds),
  };
}

/** What's left to settle with someone who already moved out (the reconciliation). */
export function outstandingAfterMoveOut(
  memberId: Id,
  members: Member[],
  expenses: Expense[],
  bills: Bill[],
): Paise {
  const m = members.find(x => x.id === memberId);
  if (!m?.moveOut) return 0;
  return moveOutSettlement(memberId, m.moveOut, members, expenses, bills).final;
}

/** A paid bill becomes an expense split by days lived in its period. */
export function billExpense(
  bill: Bill,
  payerId: Id,
  members: Member[],
  id: Id,
  date: IsoDate,
): Expense {
  return {
    id,
    title: bill.name,
    category: bill.category,
    amount: bill.amount,
    date,
    paid: { [payerId]: bill.amount },
    owed: splitByOccupancy(
      bill.amount,
      members,
      bill.periodStart,
      bill.periodEnd,
    ),
    billId: bill.id,
  };
}
