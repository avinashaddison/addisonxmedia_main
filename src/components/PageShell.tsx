import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export const PageShell = ({ title, subtitle, icon, actions, children }: Props) => {
  return (
    <div className="relative flex-1 h-full overflow-y-auto bg-muted/30">
      {/* Ambient mesh background */}
      <div className="pointer-events-none fixed inset-0 -z-0 opacity-60">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[420px] h-[420px] rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[360px] h-[360px] rounded-full bg-primary-glow/10 blur-3xl" />
      </div>

      {/* Sticky header */}
      <header className="sticky top-0 z-20 glass-strong border-b border-border/60">
        <div className="px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            {icon && (
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-primary-soft to-accent-soft text-primary flex items-center justify-center flex-shrink-0 ring-1 ring-primary/15 shadow-sm">
                {icon}
                <span className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-[17px] sm:text-[20px] font-bold tracking-tight truncate leading-tight">{title}</h1>
              {subtitle && (
                <p className="text-[11px] sm:text-[12px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-none">
              {actions}
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </header>

      <main className="relative z-10 px-4 sm:px-6 lg:px-10 py-5 sm:py-6">{children}</main>
    </div>
  );
};
