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
    <div className="flex-1 h-full overflow-y-auto bg-[#FFF6E8]">
      {/* Header — warm cream with saffron underline accent */}
      <header className="sticky top-0 z-20 bg-[#FFF6E8]/95 backdrop-blur border-b-2 border-[#E8B968]">
        <div className="px-4 sm:px-6 lg:px-10 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex-1 flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6A1F] to-[#E85C12] text-white flex items-center justify-center shadow-md flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-[22px] font-black tracking-tight leading-tight">{title}</h1>
              {subtitle && (
                <p className="text-[12px] text-foreground/60 mt-0.5 font-medium">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-10 py-5 sm:py-6">{children}</main>
    </div>
  );
};
