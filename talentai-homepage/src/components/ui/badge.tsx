import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-violet-500/20 text-violet-200 hover:bg-violet-500/30",
        secondary:
          "border-white/10 bg-white/5 text-[hsl(var(--muted-foreground))]",
        outline: "border-violet-500/30 text-violet-300",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        destructive:
          "border-rose-500/30 bg-rose-500/10 text-rose-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
