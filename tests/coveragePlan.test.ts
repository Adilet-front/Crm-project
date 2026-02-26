import { describe, expect, it } from 'vitest';
import { generateCoveragePlan, type CoverageDayMetric, type CoverageGapAlert } from '@/pages/planning/model/coveragePlan';
import type { Operation } from '@/entities/finance/model/store';

describe('generateCoveragePlan', () => {
  const monthDate = new Date(2026, 1, 1);
  const monthKey = '2026-02';

  it('builds a plan that closes gap with all major instruments', () => {
    const dayMetrics: Record<number, CoverageDayMetric> = {
      5: { expense: 300_000 },
      8: { expense: 200_000 },
      10: { income: 500_000 },
      12: { income: 600_000 },
      20: { expense: 500_000, isRisk: true },
    };
    const gapAlerts: CoverageGapAlert[] = [
      {
        date: '26 февраля',
        reason: 'Крупный расход по материалам',
        shortage: 780_000,
      },
      {
        date: '27 февраля',
        reason: 'Платеж по аренде техники',
        shortage: 430_000,
      },
    ];
    const operations: Operation[] = [
      {
        id: 1,
        date: '2026-02-10',
        type: 'Приход',
        description: 'Оплата счета',
        category: 'Выручка',
        project: 'ЖК "Горизонт"',
        contractor: 'ООО "Альфа"',
        account: 'Расчетный счет (Сбер)',
        amount: 900_000,
      },
      {
        id: 2,
        date: '2026-02-11',
        type: 'Расход',
        description: 'Покупка услуг',
        category: 'Подрядные работы',
        project: 'ЖК "Горизонт"',
        contractor: 'ООО "Бета"',
        account: 'Расчетный счет (ВТБ)',
        amount: -200_000,
      },
      {
        id: 3,
        date: '2026-02-12',
        type: 'Перевод',
        description: 'Переброска ликвидности',
        category: 'Перевод',
        project: '-',
        contractor: '-',
        account: 'Расчетный счет (Сбер) -> Расчетный счет (ВТБ)',
        amount: 100_000,
      },
    ];

    const plan = generateCoveragePlan({
      dayMetrics,
      gapAlerts,
      monthDate,
      monthKey,
      operations,
    });

    expect(plan.totalGap).toBe(1_210_000);
    expect(plan.coveredAmount).toBe(plan.totalGap);
    expect(plan.residualGap).toBe(0);
    expect(plan.totalsByType.payment_reschedule).toBeGreaterThan(0);
    expect(plan.totalsByType.receivables_acceleration).toBeGreaterThan(0);
    expect(plan.totalsByType.internal_transfer).toBeGreaterThan(0);
    expect(plan.totalsByType.external_financing).toBeGreaterThan(0);
  });

  it('returns an empty plan when no gap exists', () => {
    const plan = generateCoveragePlan({
      dayMetrics: {},
      gapAlerts: [],
      monthDate,
      monthKey,
      operations: [],
    });

    expect(plan.totalGap).toBe(0);
    expect(plan.coveredAmount).toBe(0);
    expect(plan.residualGap).toBe(0);
    expect(plan.actions).toEqual([]);
  });

  it('falls back to external financing when internal instruments are unavailable', () => {
    const gapAlerts: CoverageGapAlert[] = [
      {
        date: '26 февраля',
        reason: 'Разовый крупный платеж',
        shortage: 500_000,
      },
    ];
    const dayMetrics: Record<number, CoverageDayMetric> = {
      26: { expense: 500_000, isRisk: true },
    };

    const plan = generateCoveragePlan({
      dayMetrics,
      gapAlerts,
      monthDate,
      monthKey,
      operations: [],
    });

    expect(plan.totalGap).toBe(500_000);
    expect(plan.totalsByType.payment_reschedule).toBe(0);
    expect(plan.totalsByType.receivables_acceleration).toBe(0);
    expect(plan.totalsByType.internal_transfer).toBe(0);
    expect(plan.totalsByType.external_financing).toBe(500_000);
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]?.description).toContain('овердрафт');
  });
});
