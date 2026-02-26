import * as React from 'react';
import { cn } from './utils';

interface RadioGroupContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({});

function RadioGroup({
  className,
  value,
  onValueChange,
  name,
  ...props
}: React.ComponentProps<'div'> & {
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, name }}>
      <div data-slot="radio-group" className={cn('grid gap-3', className)} {...props} />
    </RadioGroupContext.Provider>
  );
}

function RadioGroupItem({
  className,
  value,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> & { value: string }) {
  const { value: groupValue, onValueChange, name } = React.useContext(RadioGroupContext);

  return (
    <input
      data-slot="radio-group-item"
      type="radio"
      value={value}
      name={name}
      checked={groupValue === value}
      onChange={() => onValueChange?.(value)}
      className={cn(
        'aspect-square size-4 shrink-0 rounded-full border border-input shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export { RadioGroup, RadioGroupItem };
