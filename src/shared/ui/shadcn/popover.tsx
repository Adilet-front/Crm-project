import * as React from 'react';
import { cn } from './utils';

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
}

const PopoverContext = React.createContext<PopoverContextValue>({
  open: false,
  setOpen: () => undefined,
  rootRef: { current: null },
});

function Popover({
  children,
  open: openProp,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = openProp ?? internalOpen;
  const rootRef = React.useRef<HTMLDivElement>(null);

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (openProp === undefined) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [openProp, onOpenChange]
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open, setOpen]);

  return (
    <PopoverContext.Provider value={{ open, setOpen, rootRef }}>
      <div ref={rootRef} className="relative inline-flex">
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

function PopoverTrigger({ asChild, children, ...props }: React.ComponentProps<'button'> & { asChild?: boolean }) {
  const { open, setOpen } = React.useContext(PopoverContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: (event: React.MouseEvent) => {
        const childClick = (children.props as { onClick?: (e: React.MouseEvent) => void }).onClick;
        childClick?.(event);
        setOpen(!open);
      },
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button data-slot="popover-trigger" type="button" onClick={() => setOpen(!open)} {...props}>
      {children}
    </button>
  );
}

function PopoverContent({ className, ...props }: React.ComponentProps<'div'>) {
  const { open } = React.useContext(PopoverContext);

  if (!open) {
    return null;
  }

  return (
    <div
      data-slot="popover-content"
      onClick={(event) => event.stopPropagation()}
      className={cn(
        'bg-popover text-popover-foreground absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 rounded-md border p-4 shadow-md outline-hidden',
        className
      )}
      {...props}
    />
  );
}

function PopoverAnchor({ ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
