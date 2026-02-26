import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getReportingMonthByKey,
  useReportingPeriodStore,
} from '@/entities/finance/model/periodStore';
import { cn } from '@/shared/lib/cn';
import { formatMoneyRub } from '@/shared/lib/format';
import { toast } from '@/shared/ui/shadcn/sonner';

type AnalyticsSubTab = 'cashflow' | 'pnl' | 'balance' | 'expenses' | 'debts';

const SUB_TABS: { id: AnalyticsSubTab; label: string }[] = [
  { id: 'cashflow', label: 'Денежные средства' },
  { id: 'pnl', label: 'Прибыли и убытки' },
  { id: 'balance', label: 'Баланс' },
  { id: 'expenses', label: 'Анализ расходов' },
  { id: 'debts', label: 'Задолженности' },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const CASHFLOW_SERIES = [
  { month: 'Янв', inflow: 40_200_000, outflow: 35_400_000 },
  { month: 'Фев', inflow: 45_700_000, outflow: 38_100_000 },
  { month: 'Мар', inflow: 42_800_000, outflow: 39_900_000 },
  { month: 'Апр', inflow: 50_300_000, outflow: 42_600_000 },
  { month: 'Май', inflow: 47_600_000, outflow: 40_800_000 },
  { month: 'Июн', inflow: 52_400_000, outflow: 44_200_000 },
];

const CASH_BALANCE_SPLIT = [
  { name: 'Сбербанк', value: 15_200_000 },
  { name: 'ВТБ', value: 6_400_000 },
  { name: 'Касса', value: 1_900_000 },
];

const PNL_BY_PROJECT = [
  { project: 'ЖК "Горизонт"', profit: 12_400_000 },
  { project: 'БЦ "Кристалл"', profit: 8_900_000 },
  { project: 'ТЦ "Атриум"', profit: 7_200_000 },
  { project: 'Вилла "Озерная"', profit: -2_100_000 },
  { project: 'Цех №4', profit: 4_800_000 },
];

const ASSETS_SPLIT = [
  { name: 'Денежные средства', value: 23_500_000 },
  { name: 'Дебиторская задолженность', value: 12_800_000 },
  { name: 'Запасы', value: 8_400_000 },
];

const LIABILITIES_SPLIT = [
  { name: 'Собственный капитал', value: 30_200_000 },
  { name: 'Кредиторская задолженность', value: 14_500_000 },
];

const EXPENSES_SPLIT = [
  { name: 'Персонал', value: 18_250_000, share: 52 },
  { name: 'Закупка', value: 3_410_000, share: 10 },
  { name: 'Аренда', value: 2_850_000, share: 8 },
  { name: 'Маркетинг', value: 2_280_000, share: 7 },
  { name: 'Прочие', value: 8_340_000, share: 23 },
];

const DEBTS_ROWS = [
  {
    contractor: 'ООО "СтройТех"',
    type: 'Кредиторская',
    amount: 8_450_000,
    delay: '12 дней',
    status: 'Критично',
  },
  {
    contractor: 'АО "МеталлИнвест"',
    type: 'Дебиторская',
    amount: 4_200_000,
    delay: '0 дней',
    status: 'В норме',
  },
  {
    contractor: 'ИП Иванов А.В.',
    type: 'Дебиторская',
    amount: 1_500_000,
    delay: '5 дней',
    status: 'Внимание',
  },
];

type ExportCell = string | number;
type ExportRow = ExportCell[];
type ExcelRowStyle = 'title' | 'section' | 'header';

interface ExcelRow {
  cells: ExportRow;
  style?: ExcelRowStyle;
}

interface ExcelSheet {
  name: string;
  rows: ExcelRow[];
}

const buildTsvContent = (rows: ExportRow[]): string =>
  rows
    .map((row) => row.map((cell) => String(cell).replace(/\t/g, ' ')).join('\t'))
    .join('\n');

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const toSafeSheetName = (sheetName: string): string =>
  sheetName.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31).trim() || 'Sheet';

const computeColumnWidths = (rows: ExcelRow[]): number[] => {
  const maxColumns = Math.max(1, ...rows.map((row) => row.cells.length));

  return Array.from({ length: maxColumns }, (_, columnIndex) => {
    const maxCellLength = rows.reduce((maxLength, row) => {
      const cellValue = row.cells[columnIndex];
      if (cellValue === undefined) {
        return maxLength;
      }
      return Math.max(maxLength, String(cellValue).length);
    }, 10);

    return Math.max(90, Math.min(420, maxCellLength * 7 + 20));
  });
};

const buildExcelRowXml = (row: ExcelRow, maxColumns: number): string => {
  if (row.cells.length === 0) {
    return '<Row/>';
  }

  const rowStyleAttribute = row.style ? ` ss:StyleID="${row.style}"` : '';

  const cellsXml = row.cells
    .map((cell, index) => {
      const isNumber = typeof cell === 'number' && Number.isFinite(cell);
      const mergeAcrossAttribute =
        index === 0 &&
        row.cells.length === 1 &&
        (row.style === 'title' || row.style === 'section') &&
        maxColumns > 1
          ? ` ss:MergeAcross="${maxColumns - 1}"`
          : '';
      const cellStyleAttribute = isNumber && row.style !== 'header' ? ' ss:StyleID="number"' : '';
      const cellType = isNumber ? 'Number' : 'String';
      const cellValue = isNumber ? String(cell) : escapeXml(String(cell));

      return `<Cell${cellStyleAttribute}${mergeAcrossAttribute}><Data ss:Type="${cellType}">${cellValue}</Data></Cell>`;
    })
    .join('');

  return `<Row${rowStyleAttribute}>${cellsXml}</Row>`;
};

const buildExcelWorkbookXml = (sheets: ExcelSheet[]): string => {
  const worksheetsXml = sheets
    .map((sheet) => {
      const maxColumns = Math.max(1, ...sheet.rows.map((row) => row.cells.length));
      const columnsXml = computeColumnWidths(sheet.rows)
        .map((width) => `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`)
        .join('');
      const rowsXml = sheet.rows.map((row) => buildExcelRowXml(row, maxColumns)).join('');

      return `<Worksheet ss:Name="${escapeXml(toSafeSheetName(sheet.name))}"><Table>${columnsXml}${rowsXml}</Table></Worksheet>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Borders/>
      <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#1e293b"/>
      <Interior/>
      <NumberFormat/>
      <Protection/>
    </Style>
    <Style ss:ID="title">
      <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Bold="1" ss:Color="#0f172a"/>
      <Interior ss:Color="#dbeafe" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="section">
      <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="12" ss:Bold="1" ss:Color="#0f172a"/>
      <Interior ss:Color="#eff6ff" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="header">
      <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1" ss:Color="#ffffff"/>
      <Interior ss:Color="#2563eb" ss:Pattern="Solid"/>
      <Alignment ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="number">
      <NumberFormat ss:Format="#,##0"/>
    </Style>
  </Styles>
  ${worksheetsXml}
</Workbook>`;
};

const downloadFile = (fileName: string, content: BlobPart, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
};

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsSubTab>('cashflow');
  const selectedMonthKey = useReportingPeriodStore((state) => state.selectedMonthKey);
  const selectedMonth = getReportingMonthByKey(selectedMonthKey);
  const monthMultiplier = selectedMonthKey === '2026-01' ? 0.9 : 1;

  const cashflowSeries = useMemo(
    () =>
      CASHFLOW_SERIES.map((row) => ({
        ...row,
        inflow: Math.round(row.inflow * monthMultiplier),
        outflow: Math.round(row.outflow * monthMultiplier),
      })),
    [monthMultiplier]
  );

  const cashBalanceSplit = useMemo(
    () =>
      CASH_BALANCE_SPLIT.map((row) => ({
        ...row,
        value: Math.round(row.value * monthMultiplier),
      })),
    [monthMultiplier]
  );

  const pnlByProject = useMemo(
    () =>
      PNL_BY_PROJECT.map((row) => ({
        ...row,
        profit: Math.round(row.profit * monthMultiplier),
      })),
    [monthMultiplier]
  );

  const assetsSplit = useMemo(
    () =>
      ASSETS_SPLIT.map((row) => ({
        ...row,
        value: Math.round(row.value * monthMultiplier),
      })),
    [monthMultiplier]
  );

  const liabilitiesSplit = useMemo(
    () =>
      LIABILITIES_SPLIT.map((row) => ({
        ...row,
        value: Math.round(row.value * monthMultiplier),
      })),
    [monthMultiplier]
  );

  const expensesSplit = useMemo(
    () =>
      EXPENSES_SPLIT.map((row) => ({
        ...row,
        value: Math.round(row.value * monthMultiplier),
      })),
    [monthMultiplier]
  );

  const debtsRows = useMemo(
    () =>
      DEBTS_ROWS.map((row) => ({
        ...row,
        amount: Math.round(row.amount * monthMultiplier),
      })),
    [monthMultiplier]
  );

  const workbookSheets = useMemo<ExcelSheet[]>(
    () => [
      {
        name: 'Денежные средства',
        rows: [
          { style: 'title', cells: [`Денежные средства — ${selectedMonth.label}`] },
          { style: 'section', cells: ['Динамика движения'] },
          { style: 'header', cells: ['Месяц', 'Поступления, ₽', 'Списания, ₽'] },
          ...cashflowSeries.map((row) => ({ cells: [row.month, row.inflow, row.outflow] })),
          { cells: [] },
          { style: 'section', cells: ['Структура остатков'] },
          { style: 'header', cells: ['Счет / банк', 'Остаток, ₽'] },
          ...cashBalanceSplit.map((row) => ({ cells: [row.name, row.value] })),
        ],
      },
      {
        name: 'Прибыли и убытки',
        rows: [
          { style: 'title', cells: [`Прибыли и убытки — ${selectedMonth.label}`] },
          { style: 'header', cells: ['Проект', 'Прибыль, ₽'] },
          ...pnlByProject.map((row) => ({ cells: [row.project, row.profit] })),
        ],
      },
      {
        name: 'Баланс',
        rows: [
          { style: 'title', cells: [`Баланс — ${selectedMonth.label}`] },
          { style: 'section', cells: ['Активы'] },
          { style: 'header', cells: ['Статья', 'Сумма, ₽'] },
          ...assetsSplit.map((row) => ({ cells: [row.name, row.value] })),
          { cells: [] },
          { style: 'section', cells: ['Пассивы'] },
          { style: 'header', cells: ['Статья', 'Сумма, ₽'] },
          ...liabilitiesSplit.map((row) => ({ cells: [row.name, row.value] })),
        ],
      },
      {
        name: 'Расходы',
        rows: [
          { style: 'title', cells: [`Анализ расходов — ${selectedMonth.label}`] },
          { style: 'header', cells: ['Статья', 'Сумма, ₽', 'Доля, %'] },
          ...expensesSplit.map((row) => ({ cells: [row.name, row.value, row.share] })),
        ],
      },
      {
        name: 'Задолженности',
        rows: [
          { style: 'title', cells: [`Задолженности — ${selectedMonth.label}`] },
          { style: 'header', cells: ['Контрагент', 'Тип', 'Сумма, ₽', 'Просрочка', 'Статус'] },
          ...debtsRows.map((row) => ({
            cells: [row.contractor, row.type, row.amount, row.delay, row.status],
          })),
        ],
      },
    ],
    [
      selectedMonth.label,
      cashflowSeries,
      cashBalanceSplit,
      pnlByProject,
      assetsSplit,
      liabilitiesSplit,
      expensesSplit,
      debtsRows,
    ]
  );

  const exportRows = useMemo<ExportRow[]>(
    () => [
      ['Отчет', 'Аналитика FinancePro'],
      ['Месяц', selectedMonth.label],
      [],
      ['Денежные средства: динамика движения'],
      ['Месяц', 'Поступления, ₽', 'Списания, ₽'],
      ...cashflowSeries.map((row) => [row.month, row.inflow, row.outflow] as ExportRow),
      [],
      ['Денежные средства: структура остатков'],
      ['Счет / банк', 'Остаток, ₽'],
      ...cashBalanceSplit.map((row) => [row.name, row.value] as ExportRow),
      [],
      ['Прибыли и убытки: по проектам'],
      ['Проект', 'Прибыль, ₽'],
      ...pnlByProject.map((row) => [row.project, row.profit] as ExportRow),
      [],
      ['Баланс: активы'],
      ['Статья', 'Сумма, ₽'],
      ...assetsSplit.map((row) => [row.name, row.value] as ExportRow),
      [],
      ['Баланс: пассивы'],
      ['Статья', 'Сумма, ₽'],
      ...liabilitiesSplit.map((row) => [row.name, row.value] as ExportRow),
      [],
      ['Анализ расходов'],
      ['Статья', 'Сумма, ₽', 'Доля, %'],
      ...expensesSplit.map((row) => [row.name, row.value, row.share] as ExportRow),
      [],
      ['Задолженности'],
      ['Контрагент', 'Тип', 'Сумма, ₽', 'Просрочка', 'Статус'],
      ...debtsRows.map((row) => [row.contractor, row.type, row.amount, row.delay, row.status] as ExportRow),
    ],
    [
      selectedMonth.label,
      cashflowSeries,
      cashBalanceSplit,
      pnlByProject,
      assetsSplit,
      liabilitiesSplit,
      expensesSplit,
      debtsRows,
    ]
  );

  const handleExportToExcel = async (): Promise<void> => {
    try {
      const fileName = `analytics_${selectedMonthKey}.xls`;
      downloadFile(
        fileName,
        `\uFEFF${buildExcelWorkbookXml(workbookSheets)}`,
        'application/vnd.ms-excel;charset=utf-8;'
      );

      let wasCopiedToClipboard = false;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(buildTsvContent(exportRows));
          wasCopiedToClipboard = true;
        } catch {
          wasCopiedToClipboard = false;
        }
      }

      if (wasCopiedToClipboard) {
        toast.success('Excel-файл скачан, таблица также скопирована для вставки');
        return;
      }

      toast.success('Excel-файл успешно скачан');
    } catch {
      toast.error('Не удалось выполнить экспорт в Excel');
    }
  };

  return (
    <div
      key={selectedMonthKey}
      className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Аналитика</h1>
          <p className="mt-1 text-slate-500">
            Глубокий анализ финансовых показателей компании за{' '}
            <span className="font-semibold capitalize text-slate-700">{selectedMonth.label}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleExportToExcel()}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Экспорт в Excel
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/60 bg-slate-100/60 p-1.5">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all',
              activeTab === tab.id
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'cashflow' ? (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <div className="glass-card p-8">
            <div className="mb-7">
              <h3 className="text-lg font-bold text-slate-900">Динамика движения ДС</h3>
              <p className="text-xs font-medium text-slate-400">Поступления и списания за 6 месяцев</p>
            </div>

            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflowSeries}>
                  <defs>
                    <linearGradient id="cashflowIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cashflowOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(value) => `${Math.round(value / 1_000_000)}M`}
                  />
                  <Tooltip formatter={(value) => formatMoneyRub(Number(value))} />
                  <Legend />
                  <Area type="monotone" dataKey="inflow" name="Поступления" stroke="#10b981" fill="url(#cashflowIn)" strokeWidth={3} />
                  <Area type="monotone" dataKey="outflow" name="Списания" stroke="#ef4444" fill="url(#cashflowOut)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-8">
            <div className="mb-7">
              <h3 className="text-lg font-bold text-slate-900">Структура остатков</h3>
              <p className="text-xs font-medium text-slate-400">Распределение по счетам и банкам</p>
            </div>

            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cashBalanceSplit}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                  >
                    {cashBalanceSplit.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoneyRub(Number(value))} />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'pnl' ? (
        <div className="glass-card p-8">
          <div className="mb-7">
            <h3 className="text-lg font-bold text-slate-900">Прибыльность по проектам</h3>
            <p className="text-xs font-medium text-slate-400">Сравнение прибыльных и убыточных направлений</p>
          </div>

          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnlByProject}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="project" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(value) => `${Math.round(value / 1_000_000)}M`}
                />
                <Tooltip formatter={(value) => formatMoneyRub(Number(value))} />
                <Bar dataKey="profit" radius={[8, 8, 8, 8]}>
                  {pnlByProject.map((entry) => (
                    <Cell key={entry.project} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {activeTab === 'balance' ? (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <div className="glass-card p-8">
            <h3 className="mb-7 text-lg font-bold text-slate-900">Структура активов</h3>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={assetsSplit} dataKey="value" cx="50%" cy="50%" outerRadius={120} innerRadius={70} paddingAngle={5}>
                    {assetsSplit.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoneyRub(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-8">
            <h3 className="mb-7 text-lg font-bold text-slate-900">Структура пассивов</h3>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={liabilitiesSplit}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={70}
                    paddingAngle={5}
                  >
                    {liabilitiesSplit.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoneyRub(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'expenses' ? (
        <div className="glass-card p-8">
          <h3 className="mb-7 text-lg font-bold text-slate-900">Структура расходов по статьям</h3>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expensesSplit} dataKey="value" cx="50%" cy="50%" innerRadius={90} outerRadius={130} paddingAngle={8}>
                    {expensesSplit.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoneyRub(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {expensesSplit.map((row, index) => (
                <div key={row.name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm font-medium text-slate-700">{row.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatMoneyRub(row.value)}</p>
                    <p className="text-xs text-slate-400">{row.share}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'debts' ? (
        <div className="glass-card overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/40 p-6">
            <h3 className="text-lg font-bold text-slate-900">Дебиторская и кредиторская задолженность</h3>
            <p className="text-xs font-medium text-slate-400">Детализация по контрагентам и приоритету</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  <th className="px-6 py-5">Контрагент</th>
                  <th className="px-6 py-5">Тип</th>
                  <th className="px-6 py-5 text-right">Сумма</th>
                  <th className="px-6 py-5">Просрочка</th>
                  <th className="px-6 py-5">Статус</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {debtsRows.map((row) => (
                  <tr key={row.contractor} className="cursor-default transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{row.contractor}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'status-badge',
                          row.type === 'Кредиторская' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                        )}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p
                        className={cn(
                          'data-value text-sm font-bold',
                          row.type === 'Кредиторская' ? 'text-rose-600' : 'text-emerald-600'
                        )}
                      >
                        {formatMoneyRub(row.amount)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">{row.delay}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'status-badge',
                          row.status === 'Критично' && 'bg-rose-50 text-rose-600',
                          row.status === 'Внимание' && 'bg-amber-50 text-amber-600',
                          row.status === 'В норме' && 'bg-emerald-50 text-emerald-600'
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
