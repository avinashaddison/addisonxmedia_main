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
    <div className="flex-1 h-screen overflow-y-auto bg-muted/30">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border">
        <div className="px-6 lg:px-8 py-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-[18px] font-bold tracking-tight truncate">{title}</h1>
              {subtitle && (
                <p className="text-[12px] text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      </header>

      <main className="px-6 lg:px-8 py-6">{children}</main>
    </div>
  );
};
