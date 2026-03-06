import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Beautiful Card
export function Card({ className, children, onClick }: { className?: string, children: React.ReactNode, onClick?: () => void }) {
  const isClickable = !!onClick;
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-card rounded-2xl p-5 shadow-soft border border-border/40",
        isClickable && "cursor-pointer hover:shadow-elevated hover:border-primary/20 active:scale-[0.98] transition-all duration-200",
        className
      )}
    >
      {children}
    </div>
  );
}

// Mobile optimized Input
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-14 w-full rounded-xl border-2 border-border/60 bg-background px-4 py-2 text-base ring-offset-background",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10",
          "disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 touch-target",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
)
Input.displayName = "Input"

// Premium Button
export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'secondary' | 'outline' | 'ghost', size?: 'default' | 'lg' | 'sm' | 'icon' }>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default: "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
      outline: "border-2 border-primary/20 bg-transparent text-primary hover:bg-primary/5 active:bg-primary/10",
      ghost: "bg-transparent text-foreground hover:bg-secondary/50 active:bg-secondary",
    };
    
    const sizes = {
      default: "h-14 px-6 py-2 rounded-xl text-base font-semibold",
      lg: "h-16 px-8 rounded-2xl text-lg font-bold",
      sm: "h-10 px-4 rounded-lg text-sm font-medium",
      icon: "h-14 w-14 rounded-xl flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap transition-all duration-200 touch-target",
          "disabled:opacity-50 disabled:pointer-events-none disabled:transform-none disabled:shadow-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
)
Button.displayName = "Button"

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground mb-2 block ml-1", className)}
      {...props}
    />
  )
)
Label.displayName = "Label"
