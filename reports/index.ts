import { BalanceSheet } from './BalanceSheet/BalanceSheet';
import { GeneralLedger } from './GeneralLedger/GeneralLedger';
import { ProfitAndLoss } from './ProfitAndLoss/ProfitAndLoss';
import { TrialBalance } from './TrialBalance/TrialBalance';
import { StockBalance } from './inventory/StockBalance';
import { StockLedger } from './inventory/StockLedger';
import { AtomicProfitAndLoss } from './AtomicProfitAndLoss/AtomicProfitAndLoss';

export const reports = {
  GeneralLedger,
  ProfitAndLoss,
  BalanceSheet,
  TrialBalance,
  StockLedger,
  StockBalance,
  AtomicProfitAndLoss,
} as const;