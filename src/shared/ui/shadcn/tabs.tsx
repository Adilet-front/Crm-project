import * as React from 'react';
import { cn } from './utils';

interface TabsContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({});

function Tabs({
  className,
  value,
  onValueChange,
  ...props
}: React.ComponentProps<'div'> & {
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div data-slot="tabs" className={cn('flex flex-col gap-2', className)} {...props} />
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="tabs-list"
      className={cn('bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-xl p-[3px]', className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  value,
  ...props
}: React.ComponentProps<'button'> & { value: string }) {
  const ctx = React.useContext(TabsContext);
  const isActive = ctx.value === value;

  return (
    <button
      data-slot="tabs-trigger"
      type="button"
      onClick={() => ctx.onValueChange?.(value)}
      className={cn(
        'inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-card text-foreground border-input'
          : 'text-foreground hover:bg-accent/60',
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  value,
  ...props
}: React.ComponentProps<'div'> & { value: string }) {
  const ctx = React.useContext(TabsContext);

  if (ctx.value !== value) {
    return null;
  }

  return <div data-slot="tabs-content" className={cn('flex-1 outline-none', className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
