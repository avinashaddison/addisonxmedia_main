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
  const total = data.reduce((s, d) => s + d.new, 0);
  const wonTotal = data.reduce((s, d) => s + d.won, 0);

  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-bold tracking-tight">Lead Performance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">New leads vs deals won this week</p>
        </div>
        <div className="flex gap-4">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-accent" />
              <span className="text-[11px] text-muted-foreground">New leads</span>
            </div>
            <p className="text-base font-bold mt-0.5">{total}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
              <span className="text-[11px] text-muted-foreground">Won</span>
            </div>
            <p className="text-base font-bold mt-0.5">{wonTotal}</p>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 h-44 px-1">
        {data.map((d, i) => {
          const newH = (d.new / max) * 100;
          const wonH = (d.won / max) * 100;
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full flex items-end justify-center gap-1 h-full">
                <div
                  className="flex-1 max-w-[18px] bg-accent/80 rounded-t-md hover:bg-accent transition-all relative group/bar"
                  style={{ height: `${newH}%`, animationDelay: `${i * 80}ms` }}
                >
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity bg-foreground text-background px-1.5 py-0.5 rounded whitespace-nowrap">
                    {d.new}
                  </span>
                </div>
                <div
                  className="flex-1 max-w-[18px] bg-primary rounded-t-md hover:bg-primary-glow transition-all relative group/bar"
                  style={{ height: `${wonH}%` }}
                >
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity bg-foreground text-background px-1.5 py-0.5 rounded whitespace-nowrap">
                    {d.won}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
