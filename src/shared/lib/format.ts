export const formatMoneyMillions = (value: number): string => {
  return `₽ ${value.toFixed(2)}M`;
};

export const formatMoneyRub = (value: number): string => {
  return `₽ ${new Intl.NumberFormat('ru-RU').format(value)}`;
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
