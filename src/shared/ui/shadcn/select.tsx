import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check } from 'lucide-react';
import { cn } from './utils';

interface NativeLikeSelectProps
{
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  title?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

interface SelectOptionEntry {
  value: string;
  label: React.ReactNode;
  disabled: boolean;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

interface SelectTriggerProps extends React.ComponentProps<'div'> {
  size?: 'sm' | 'default';
}

interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

const SELECT_ITEM = Symbol('SELECT_ITEM');
const SELECT_TRIGGER = Symbol('SELECT_TRIGGER');
const SELECT_CONTENT = Symbol('SELECT_CONTENT');
const SELECT_VALUE = Symbol('SELECT_VALUE');

function getNodeText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((entry) => getNodeText(entry)).join('').trim();
  }

  if (React.isValidElement(node)) {
    return getNodeText((node.props as { children?: React.ReactNode }).children);
  }

  return '';
}

function extractOptions(node: React.ReactNode): SelectOptionEntry[] {
  const options: SelectOptionEntry[] = [];

  const walk = (entry: React.ReactNode) => {
    React.Children.forEach(entry, (child) => {
      if (!React.isValidElement(child)) {
        return;
      }

      const type = child.type as { __slotType?: symbol };
      const props = child.props as {
        children?: React.ReactNode;
        value?: string | number;
        disabled?: boolean;
      };

      if (typeof child.type === 'string' && child.type.toLowerCase() === 'option') {
        const fallbackValue = getNodeText(props.children);
        options.push({
          value: props.value !== undefined ? String(props.value) : fallbackValue,
          label: props.children,
          disabled: Boolean(props.disabled),
        });
        return;
      }

      if (type.__slotType === SELECT_ITEM) {
        const itemProps = child.props as SelectItemProps;
        options.push({
          value: itemProps.value,
          label: itemProps.children,
          disabled: Boolean(itemProps.disabled),
        });
        return;
      }

      walk(props.children);
    });
  };

  walk(node);
  return options;
}

function useSelectOptions(children: React.ReactNode) {
  const options = React.useMemo(() => extractOptions(children), [children]);

  const getFallbackValue = React.useCallback(
    (value?: string) => {
      if (value !== undefined && options.some((option) => option.value === value)) {
        return value;
      }
      return options.find((option) => !option.disabled)?.value ?? '';
    },
    [options]
  );

  return { options, getFallbackValue };
}

function useSelectValue({
  value,
  defaultValue,
  options,
  getFallbackValue,
}: {
  value?: string;
  defaultValue?: string;
  options: SelectOptionEntry[];
  getFallbackValue: (value?: string) => string;
}) {
  const isControlled = value !== undefined;
  const fallbackValue = getFallbackValue(defaultValue);
  const [internalValue, setInternalValue] = React.useState(fallbackValue);

  React.useEffect(() => {
    if (!isControlled) {
      setInternalValue(fallbackValue);
    }
  }, [fallbackValue, isControlled]);

  const selectedValue = isControlled ? value : internalValue;
  const normalizedValue = selectedValue ?? '';
  const hasOption = normalizedValue ? options.some((option) => option.value === normalizedValue) : false;
  const resolvedValue = hasOption ? normalizedValue : getFallbackValue(normalizedValue || undefined);

  return {
    isControlled,
    resolvedValue,
    setInternalValue,
  };
}

function Select({
  value,
  defaultValue,
  onChange,
  onValueChange,
  className,
  children,
  name,
  disabled,
  required,
  id,
  title,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
}: NativeLikeSelectProps) {
  const { options, getFallbackValue } = useSelectOptions(children);
  const { isControlled, resolvedValue, setInternalValue } = useSelectValue({
    value,
    defaultValue,
    options,
    getFallbackValue,
  });

  const handleValueChange = (nextValue: string) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onValueChange?.(nextValue);

    if (onChange) {
      const syntheticEvent = {
        target: { value: nextValue },
        currentTarget: { value: nextValue },
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <>
      <SelectPrimitive.Root value={resolvedValue} onValueChange={handleValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          data-slot="select"
          id={id}
          title={title}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
          className={cn('app-select', className)}
          aria-required={required}
        >
          <SelectPrimitive.Value className="truncate text-left" />
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            className={cn(
              'z-[220] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[2rem] border-2 border-[#8ea8cf] bg-[#53667f]/95 p-2 text-slate-100 shadow-[0_26px_56px_rgba(15,23,42,0.42)] backdrop-blur-2xl',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
            )}
          >
            <SelectPrimitive.Viewport className="max-h-[320px]">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    'relative flex min-h-12 cursor-pointer select-none items-center rounded-[1.5rem] py-2.5 pl-11 pr-4 text-[17px] font-semibold leading-tight whitespace-normal text-slate-100/95 outline-none transition-colors',
                    'focus:bg-[#6c7f99] focus:text-white',
                    'data-[state=checked]:bg-gradient-to-b data-[state=checked]:from-[#56a8ff] data-[state=checked]:to-[#1f63ff] data-[state=checked]:text-white',
                    'data-[state=checked]:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                  )}
                >
                  <span className="pointer-events-none absolute left-4 inline-flex h-5 w-5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-5 w-5 text-white" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {name ? <input type="hidden" name={name} value={resolvedValue} /> : null}
    </>
  );
}

function SelectTrigger({ children }: SelectTriggerProps) {
  return <>{children}</>;
}

function SelectContent({ children }: React.ComponentProps<'div'>) {
  return <>{children}</>;
}

function SelectItem({ children }: SelectItemProps) {
  return <>{children}</>;
}

function SelectValue({ children }: SelectValueProps) {
  return <>{children}</>;
}

function SelectGroup({ children }: React.ComponentProps<'div'>) {
  return <>{children}</>;
}

function SelectLabel({ children }: React.ComponentProps<'span'>) {
  return <>{children}</>;
}

function SelectSeparator() {
  return null;
}

function SelectScrollUpButton() {
  return null;
}

function SelectScrollDownButton() {
  return null;
}

(SelectTrigger as { __slotType?: symbol }).__slotType = SELECT_TRIGGER;
(SelectContent as { __slotType?: symbol }).__slotType = SELECT_CONTENT;
(SelectItem as { __slotType?: symbol }).__slotType = SELECT_ITEM;
(SelectValue as { __slotType?: symbol }).__slotType = SELECT_VALUE;

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
