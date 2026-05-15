import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-extrabold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#FF6A1F] text-white shadow-[0_4px_0_0_#B8420A] hover:bg-[#E85C12] hover:shadow-[0_2px_0_0_#B8420A] hover:translate-y-[2px] active:translate-y-[3px] active:shadow-[0_1px_0_0_#B8420A]",
        destructive:
          "bg-[#D4308E] text-white shadow-[0_4px_0_0_#A11A6A] hover:bg-[#C02680] hover:shadow-[0_2px_0_0_#A11A6A] hover:translate-y-[2px]",
        outline:
          "border-2 border-[#E8B968] bg-white text-foreground hover:bg-[#FFF1D6] shadow-[0_3px_0_0_#E8B968] hover:shadow-[0_1px_0_0_#E8B968] hover:translate-y-[2px]",
        secondary:
          "bg-[#FFF1D6] text-foreground border-2 border-[#E8B968] hover:bg-[#FFE8C7]",
        ghost: "hover:bg-[#FFE8C7] text-foreground",
        link: "text-[#FF6A1F] underline-offset-4 hover:underline font-bold",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
