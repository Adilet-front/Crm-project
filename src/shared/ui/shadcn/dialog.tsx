import * as React from 'react';
import { XIcon } from 'lucide-react';
import { cn } from './utils';

interface DialogContextValue {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue>({ open: false });

function Dialog({
  open = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>;
}

function DialogTrigger({ children, ...props }: React.ComponentProps<'button'>) {
  const { onOpenChange } = React.useContext(DialogContext);

  return (
    <button data-slot="dialog-trigger" type="button" onClick={() => onOpenChange?.(true)} {...props}>
      {children}
    </button>
  );
}

function DialogClose({ children, ...props }: React.ComponentProps<'button'>) {
  const { onOpenChange } = React.useContext(DialogContext);

  return (
    <button data-slot="dialog-close" type="button" onClick={() => onOpenChange?.(false)} {...props}>
      {children}
    </button>
  );
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<'div'>) {
  const { open } = React.useContext(DialogContext);
  if (!open) {
    return null;
  }
  return <div data-slot="dialog-overlay" className={cn('fixed inset-0 z-50 bg-black/50', className)} {...props} />;
}

function DialogContent({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { open, onOpenChange } = React.useContext(DialogContext);

  if (!open) {
    return null;
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        data-slot="dialog-content"
        className={cn(
          'bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
          className
        )}
        {...props}
      >
        {children}
        <button
          type="button"
          onClick={() => onOpenChange?.(false)}
          className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100"
        >
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn('flex flex-col gap-2 text-center sm:text-left', className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 data-slot="dialog-title" className={cn('text-lg leading-none font-semibold', className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="dialog-description" className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
