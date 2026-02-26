import { format, parse } from 'date-fns';
import { ru } from 'date-fns/locale';
import { create } from 'zustand';

const MONTH_FORMAT = 'yyyy-MM';
const MOCK_MONTH_KEYS = ['2026-01', '2026-02'] as const;

const toMonthDate = (monthKey: string) => parse(`${monthKey}-01`, 'yyyy-MM-dd', new Date());
const toMonthKey = (date: Date) => format(date, MONTH_FORMAT);

export interface ReportingMonthOption {
  key: string;
  date: Date;
  label: string;
  shortLabel: string;
  yearLabel: string;
}

const buildMonthOption = (date: Date): ReportingMonthOption => ({
  key: toMonthKey(date),
  date,
  label: format(date, 'LLLL yyyy', { locale: ru }),
  shortLabel: format(date, 'LLL', { locale: ru }),
  yearLabel: format(date, 'yyyy'),
});

export const REPORTING_MONTHS: ReportingMonthOption[] = MOCK_MONTH_KEYS.map((monthKey) =>
  buildMonthOption(toMonthDate(monthKey))
);

const getMonthIndex = (monthKey: string) =>
  REPORTING_MONTHS.findIndex((reportingMonth) => reportingMonth.key === monthKey);

interface ReportingPeriodState {
  selectedMonthKey: string;
  setMonthByKey: (monthKey: string) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
}

const DEFAULT_MONTH_KEY = REPORTING_MONTHS[REPORTING_MONTHS.length - 1]?.key ?? '2026-02';

export const useReportingPeriodStore = create<ReportingPeriodState>((set, get) => ({
  selectedMonthKey: DEFAULT_MONTH_KEY,
  setMonthByKey: (monthKey) => {
    if (getMonthIndex(monthKey) === -1) {
      return;
    }
    set({ selectedMonthKey: monthKey });
  },
  goToPreviousMonth: () => {
    const index = getMonthIndex(get().selectedMonthKey);
    if (index <= 0) {
      return;
    }
    set({ selectedMonthKey: REPORTING_MONTHS[index - 1].key });
  },
  goToNextMonth: () => {
    const index = getMonthIndex(get().selectedMonthKey);
    if (index === -1 || index >= REPORTING_MONTHS.length - 1) {
      return;
    }
    set({ selectedMonthKey: REPORTING_MONTHS[index + 1].key });
  },
}));

export const getReportingMonthByKey = (monthKey: string) =>
  REPORTING_MONTHS.find((reportingMonth) => reportingMonth.key === monthKey) ??
  REPORTING_MONTHS[REPORTING_MONTHS.length - 1];

export const isDateInReportingMonth = (dateIso: string, monthKey: string) => dateIso.startsWith(monthKey);
