import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border-2 border-[#E8B968] bg-white px-3.5 py-2.5 text-sm font-medium ring-offset-background placeholder:text-foreground/40 focus-visible:outline-none focus-visible:border-[#FF6A1F] focus-visible:shadow-[0_3px_0_0_#B8420A] transition-all disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
