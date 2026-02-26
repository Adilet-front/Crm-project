import { cn } from './utils';

function toDateInputValue(value?: Date) {
  if (!value) {
    return '';
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function Calendar({
  className,
  selected,
  onSelect,
}: {
  className?: string;
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  mode?: 'single';
  initialFocus?: boolean;
}) {
  return (
    <div className={cn('p-3', className)}>
      <input
        type="date"
        value={toDateInputValue(selected)}
        onChange={(event) => {
          if (!event.target.value) {
            onSelect?.(undefined);
            return;
          }
          onSelect?.(new Date(event.target.value));
        }}
        className="border-input bg-input-background text-sm flex h-9 w-full items-center rounded-md border px-3 py-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
    </div>
  );
}

export { Calendar };
