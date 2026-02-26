import type { Operation } from '@/entities/finance/model/store';

export interface CoverageDayMetric {
  income?: number;
  expense?: number;
  isRisk?: boolean;
}

export interface CoverageGapAlert {
  date: string;
  reason: string;
  shortage: number;
}

export type CoverageActionType =
  | 'payment_reschedule'
  | 'receivables_acceleration'
  | 'external_financing'
  | 'internal_transfer';

export interface CoveragePlanAction {
  id: string;
  type: CoverageActionType;
  riskDateLabel: string;
  amount: number;
  title: string;
  description: string;
}

export interface CoveragePlan {
  totalGap: number;
  coveredAmount: number;
  residualGap: number;
  actions: CoveragePlanAction[];
  totalsByType: Record<CoverageActionType, number>;
}

interface GenerateCoveragePlanParams {
  dayMetrics: Record<number, CoverageDayMetric>;
  gapAlerts: CoverageGapAlert[];
  monthDate: Date;
  monthKey: string;
  operations: Operation[];
}

interface TransferPair {
  sourceAccount: string;
  targetAccount: string;
  availableAmount: number;
}

const DEFAULT_SOURCE_ACCOUNT = 'Расчетный счет (Сбер)';
const DEFAULT_TARGET_ACCOUNT = 'Расчетный счет (ВТБ)';

const emptyTotals = (): Record<CoverageActionType, number> => ({
  payment_reschedule: 0,
  receivables_acceleration: 0,
  external_financing: 0,
  internal_transfer: 0,
});

const extractDayNumber = (dateLabel: string): number | null => {
  const match = dateLabel.match(/\d{1,2}/);

  if (!match) {
    return null;
  }

  const day = Number(match[0]);

  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return null;
  }

  return day;
};

const formatDateLabel = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${day}.${month}`;
};

const calculatePostponeUntilLabel = (
  monthDate: Date,
  riskDateLabel: string,
  postponeDays: number
) => {
  const day = extractDayNumber(riskDateLabel);

  if (!day) {
    return `через ${postponeDays} дн.`;
  }

  const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
  date.setDate(date.getDate() + postponeDays);
  return formatDateLabel(date);
};

const allocateAmountByWeights = (totalAmount: number, weights: number[]): number[] => {
  if (weights.length === 0) {
    return [];
  }

  if (totalAmount <= 0) {
    return weights.map(() => 0);
  }

  const weightSum = weights.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (weightSum <= 0) {
    const equal = Math.floor(totalAmount / weights.length);
    const remainder = totalAmount - equal * weights.length;
    return weights.map((_, index) => equal + (index < remainder ? 1 : 0));
  }

  const rawAllocations = weights.map((weight) => (Math.max(0, weight) / weightSum) * totalAmount);
  const allocations = rawAllocations.map((value) => Math.floor(value));
  const allocated = allocations.reduce((sum, value) => sum + value, 0);
  let remainder = totalAmount - allocated;

  if (remainder > 0) {
    const sortedByFraction = rawAllocations
      .map((value, index) => ({
        index,
        fraction: value - Math.floor(value),
      }))
      .sort((left, right) => right.fraction - left.fraction);

    for (let i = 0; i < remainder; i += 1) {
      allocations[sortedByFraction[i % sortedByFraction.length].index] += 1;
    }
    remainder = 0;
  }

  if (remainder < 0) {
    const sortedByAmount = allocations
      .map((value, index) => ({ index, value }))
      .sort((left, right) => right.value - left.value);

    for (let i = 0; i < Math.abs(remainder); i += 1) {
      const position = sortedByAmount[i % sortedByAmount.length];
      allocations[position.index] = Math.max(0, allocations[position.index] - 1);
    }
  }

  return allocations;
};

const buildAccountBalances = (operations: Operation[]) => {
  const balances: Record<string, number> = {};

  operations.forEach((operation) => {
    if (operation.type === 'Перевод' && operation.account.includes('->')) {
      const [sourceRaw, targetRaw] = operation.account.split('->');

      if (sourceRaw && targetRaw) {
        const source = sourceRaw.trim();
        const target = targetRaw.trim();
        const amount = Math.abs(operation.amount);

        balances[source] = (balances[source] ?? 0) - amount;
        balances[target] = (balances[target] ?? 0) + amount;
        return;
      }
    }

    const account = operation.account.trim();
    balances[account] = (balances[account] ?? 0) + operation.amount;
  });

  return balances;
};

const resolveTransferPair = (accountBalances: Record<string, number>): TransferPair => {
  const entries = Object.entries(accountBalances);
  if (entries.length === 0) {
    return {
      sourceAccount: DEFAULT_SOURCE_ACCOUNT,
      targetAccount: DEFAULT_TARGET_ACCOUNT,
      availableAmount: 0,
    };
  }

  const sortedByBalanceDesc = [...entries].sort((left, right) => right[1] - left[1]);
  const sortedByBalanceAsc = [...entries].sort((left, right) => left[1] - right[1]);

  const [sourceAccount, sourceBalance] = sortedByBalanceDesc[0];
  let targetAccount = sortedByBalanceAsc[0][0];

  if (targetAccount === sourceAccount && sortedByBalanceAsc[1]) {
    targetAccount = sortedByBalanceAsc[1][0];
  }

  return {
    sourceAccount,
    targetAccount,
    availableAmount: Math.max(0, Math.round(sourceBalance * 0.3)),
  };
};

const toRoundedPositive = (value: number) => Math.max(0, Math.round(value));

export const generateCoveragePlan = ({
  dayMetrics,
  gapAlerts,
  monthDate,
  monthKey,
  operations,
}: GenerateCoveragePlanParams): CoveragePlan => {
  const normalizedAlerts = gapAlerts
    .map((alert) => ({
      ...alert,
      shortage: toRoundedPositive(alert.shortage),
    }))
    .filter((alert) => alert.shortage > 0);

  const totalGap = normalizedAlerts.reduce((sum, alert) => sum + alert.shortage, 0);

  if (totalGap === 0) {
    return {
      totalGap: 0,
      coveredAmount: 0,
      residualGap: 0,
      actions: [],
      totalsByType: emptyTotals(),
    };
  }

  const totalNonRiskExpenses = Object.values(dayMetrics).reduce((sum, metric) => {
    const expense = metric.expense ?? 0;
    if (expense <= 0 || metric.isRisk) {
      return sum;
    }
    return sum + expense;
  }, 0);

  const totalExpectedIncome = Object.values(dayMetrics).reduce(
    (sum, metric) => sum + Math.max(0, metric.income ?? 0),
    0
  );

  const monthOperations = operations.filter((operation) => operation.date.startsWith(monthKey));
  const accountBalances = buildAccountBalances(monthOperations);
  const transferPair = resolveTransferPair(accountBalances);

  const paymentReschedulePotential = toRoundedPositive(totalNonRiskExpenses * 0.45);
  const receivablesPotential = toRoundedPositive(totalExpectedIncome * 0.35);
  const internalTransferPotential = toRoundedPositive(transferPair.availableAmount);

  const paymentRescheduleAmount = Math.min(
    toRoundedPositive(totalGap * 0.35),
    paymentReschedulePotential
  );
  const receivablesAmount = Math.min(toRoundedPositive(totalGap * 0.25), receivablesPotential);
  const internalTransferAmount = Math.min(
    toRoundedPositive(totalGap * 0.2),
    internalTransferPotential
  );
  const externalFinancingAmount = Math.max(
    0,
    totalGap - paymentRescheduleAmount - receivablesAmount - internalTransferAmount
  );

  const weights = normalizedAlerts.map((alert) => alert.shortage);
  const paymentRescheduleAlloc = allocateAmountByWeights(paymentRescheduleAmount, weights);
  const receivablesAlloc = allocateAmountByWeights(receivablesAmount, weights);
  const internalTransferAlloc = allocateAmountByWeights(internalTransferAmount, weights);
  const externalFinancingAlloc = allocateAmountByWeights(externalFinancingAmount, weights);

  const actions: CoveragePlanAction[] = [];

  normalizedAlerts.forEach((alert, index) => {
    const paymentShift = paymentRescheduleAlloc[index] ?? 0;
    const receivables = receivablesAlloc[index] ?? 0;
    const internalTransfer = internalTransferAlloc[index] ?? 0;
    const externalFinancing = externalFinancingAlloc[index] ?? 0;
    const postponeUntilLabel = calculatePostponeUntilLabel(monthDate, alert.date, 5);

    if (paymentShift > 0) {
      actions.push({
        id: `reschedule-${index}`,
        type: 'payment_reschedule',
        riskDateLabel: alert.date,
        amount: paymentShift,
        title: 'Перенос низкоприоритетных платежей',
        description: `Сдвинуть оплаты без критичных штрафов до ${postponeUntilLabel}, чтобы разгрузить дату риска.`,
      });
    }

    if (receivables > 0) {
      actions.push({
        id: `receivables-${index}`,
        type: 'receivables_acceleration',
        riskDateLabel: alert.date,
        amount: receivables,
        title: 'Ускорение работы с дебиторкой',
        description:
          'Согласовать с клиентами частичную досрочную оплату по ближайшим актам и счетам.',
      });
    }

    if (internalTransfer > 0) {
      actions.push({
        id: `internal-${index}`,
        type: 'internal_transfer',
        riskDateLabel: alert.date,
        amount: internalTransfer,
        title: 'Внутренний перевод между счетами',
        description: `Перебросить ликвидность со счета «${transferPair.sourceAccount}» на «${transferPair.targetAccount}».`,
      });
    }

    if (externalFinancing > 0) {
      const financingTool = receivables > 0 ? 'факторинг' : 'овердрафт';
      actions.push({
        id: `external-${index}`,
        type: 'external_financing',
        riskDateLabel: alert.date,
        amount: externalFinancing,
        title: 'Привлечение внешнего финансирования',
        description: `Открыть краткосрочный ${financingTool} для покрытия остатка кассового разрыва.`,
      });
    }
  });

  const totalsByType = actions.reduce<Record<CoverageActionType, number>>((acc, action) => {
    acc[action.type] += action.amount;
    return acc;
  }, emptyTotals());

  const coveredAmount = actions.reduce((sum, action) => sum + action.amount, 0);

  return {
    totalGap,
    coveredAmount,
    residualGap: Math.max(0, totalGap - coveredAmount),
    actions,
    totalsByType,
  };
};
