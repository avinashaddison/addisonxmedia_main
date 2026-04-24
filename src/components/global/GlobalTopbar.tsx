import { GlobalSearch } from "./GlobalSearch";
import { NotificationCenter } from "./NotificationCenter";

type Props = { onNavigate: (page: string) => void };

export const GlobalTopbar = ({ onNavigate }: Props) => {
  return (
    <header className="h-14 px-4 border-b border-border bg-card/70 backdrop-blur-xl flex items-center gap-3 flex-shrink-0 z-30">
      <div className="flex-1 flex items-center justify-center">
        <GlobalSearch onNavigate={onNavigate} />
      </div>
      <NotificationCenter onNavigate={onNavigate} />
    </header>
  );
};
