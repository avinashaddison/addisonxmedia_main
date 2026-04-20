const data = [
  { day: "Mon", new: 42, won: 8 },
  { day: "Tue", new: 58, won: 12 },
  { day: "Wed", new: 71, won: 15 },
  { day: "Thu", new: 64, won: 11 },
  { day: "Fri", new: 89, won: 22 },
  { day: "Sat", new: 76, won: 18 },
  { day: "Sun", new: 95, won: 28 },
];

export const Charts = () => {
  const max = Math.max(...data.map(d => d.new));
  const totalNew = data.reduce((s, d) => s + d.new, 0);
  const totalWon = data.reduce((s, d) => s + d.won, 0);

  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-bold tracking-tight">Lead Performance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">New leads vs deals closed this week</p>
        </div>
        <div className="flex gap-5">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-sm bg-accent" />
              <span className="text-[10px] text-muted-foreground">New</span>
            </div>
            <p className="text-base font-bold tabular-nums">{totalNew}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-sm bg-primary" />
              <span className="text-[10px] text-muted-foreground">Won</span>
            </div>
            <p className="text-base font-bold tabular-nums">{totalWon}</p>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-4 h-40 px-1">
        {data.map((d, i) => {
          const newH = (d.new / max) * 100;
          const wonH = (d.won / max) * 100;
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 group">
              <div className="w-full flex items-end justify-center gap-[3px] h-full">
                <div className="flex-1 max-w-[16px] bg-accent/20 rounded-t hover:bg-accent/30 transition-all relative" style={{ height: `${newH}%` }}>
                  <div className="absolute inset-x-0 bottom-0 bg-accent rounded-t transition-all" style={{ height: '100%' }} />
                </div>
                <div className="flex-1 max-w-[16px] bg-primary/20 rounded-t hover:bg-primary/30 transition-all relative" style={{ height: `${wonH}%` }}>
                  <div className="absolute inset-x-0 bottom-0 bg-primary rounded-t transition-all" style={{ height: '100%' }} />
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
