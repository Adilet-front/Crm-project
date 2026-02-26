/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';
import { cn } from './utils';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-white hover:bg-destructive/90',
  outline: 'border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 rounded-md gap-1.5 px-3',
  lg: 'h-10 rounded-md px-6',
  icon: 'size-9 rounded-md',
};

export const buttonVariants = ({
  variant = 'default',
  size = 'default',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) =>
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    className
  );

function renderAsChild(
  child: React.ReactNode,
  className: string,
  props: Omit<ButtonProps, 'asChild' | 'children' | 'className' | 'variant' | 'size'>
) {
  if (!React.isValidElement(child)) {
    return null;
  }

  const nextProps = {
    ...props,
    className: cn((child.props as { className?: string }).className, className),
  };

  return React.cloneElement(child, nextProps);
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const mergedClassName = buttonVariants({ variant, size, className });

  if (asChild) {
    return renderAsChild(children, mergedClassName, props);
  }

  return (
    <button data-slot="button" className={mergedClassName} {...props}>
      {children}
    </button>
  );
}

export { Button };
