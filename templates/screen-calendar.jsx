// screen-calendar.jsx — Dividend calendar with year heatmap

function CalendarScreen({ tweak }) {
  // Build per-month per-day aggregation of expected income
  const grid = {};
  for (let m = 1; m <= 12; m++) {
    grid[m] = {};
    for (let d = 1; d <= 31; d++) grid[m][d] = { sum: 0, events: [] };
  }
  DIV_EVENTS.forEach(e => {
    if (grid[e.mo] && grid[e.mo][e.day]) {
      grid[e.mo][e.day].sum += e.grossEUR;
      grid[e.mo][e.day].events.push(e);
    }
  });
  // Per-month totals
  const monthSums = Array.from({ length: 12 }, (_, i) => {
    let s = 0;
    Object.values(grid[i + 1]).forEach(d => { s += d.sum; });
    return s;
  });
  const yearTotal = monthSums.reduce((a, b) => a + b, 0);
  const maxDay = Math.max(...Object.values(grid).flatMap(m => Object.values(m).map(d => d.sum)));
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Today indicator (May 21)
  const today = { mo: 5, day: 21 };

  // Next month — list of events
  const nextEvents = DIV_EVENTS
    .filter(e => (e.mo === 5 && e.day >= 21) || e.mo === 6)
    .sort((a, b) => a.mo * 100 + a.day - (b.mo * 100 + b.day));

  return (
    <Screen tweak={tweak} active="Calendar" statusLeft="DIVIDEND CALENDAR · 2026"
      statusSegs={["Display: ex-div day", "All currencies → EUR", "Forward 12mo", "May 21 · today"]}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 8, gap: 8, minHeight: 0 }}>
        {/* Top strip */}
        <StatStrip cols={5} items={[
          { label: "Year total · forward", value: <span className="blur-sensitive">{fmt.money(yearTotal, "EUR", { dec: 0 })}</span>, sub: <span className="dim">across 184 events</span> },
          { label: "Payments this week", value: "3", sub: <span className="dim">May 21 – May 27</span> },
          { label: "Heaviest month", value: monthNames[monthSums.indexOf(Math.max(...monthSums))], sub: <span className="mono blur-sensitive">{fmt.money(Math.max(...monthSums), "EUR", { dec: 0 })}</span> },
          { label: "Avg per month", value: <span className="blur-sensitive">{fmt.money(yearTotal / 12, "EUR", { dec: 0 })}</span>, sub: <span className="dim">€{fmt.num(yearTotal / 365, 0)} per day</span> },
          { label: "Monthly payers", value: "1", sub: <span className="dim">O · 12 events</span> },
        ]} />

        <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 8, flex: 1, minHeight: 0 }}>
          {/* Year heatmap */}
          <Panel title="Year heatmap · ex-div by day · €" tag="2026 forward"
            headRight={
              <span style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: 12, fontSize: 9.5, color: "var(--muted)" }}>
                <span>less</span>
                {[0.1, 0.3, 0.5, 0.7, 0.95].map((f, i) =>
                  <i key={i} style={{ display: "inline-block", width: 12, height: 8, background: `color-mix(in oklab, var(--accent) ${f * 100}%, var(--surface-2))` }} />
                )}
                <span>more</span>
              </span>
            }>
            <div style={{ overflow: "auto", height: "100%" }}>
              <table className="t" style={{ width: "100%", tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    {Array.from({ length: 31 }, (_, i) => (
                      <th key={i} className="c" style={{ fontSize: 8.5, padding: "3px 1px" }}>{i + 1}</th>
                    ))}
                    <th className="r" style={{ width: 60 }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {monthNames.map((mn, mi) => (
                    <tr key={mn}>
                      <td className="l mono" style={{ fontSize: 10, color: "var(--text-2)", padding: "2px 6px", height: 22 }}>{mn}</td>
                      {Array.from({ length: 31 }, (_, di) => {
                        const cell = grid[mi + 1][di + 1];
                        const isToday = (mi + 1) === today.mo && (di + 1) === today.day;
                        const bg = cell.sum > 0 ? heatColor(cell.sum, maxDay) : "var(--surface-2)";
                        // mark days with multiple events with a tiny dot
                        const evtCount = cell.events.length;
                        return (
                          <td key={di} className="c" style={{ padding: 0, height: 22, position: "relative" }}>
                            <div style={{
                              position: "absolute", inset: 1, background: bg,
                              border: isToday ? "1.5px solid var(--accent)" : "none",
                              boxShadow: isToday ? "0 0 0 1px var(--bg)" : "none",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {cell.sum > 0 && (
                                <span style={{ fontSize: 7.5, color: cell.sum > maxDay * 0.5 ? "var(--bg)" : "var(--text-2)", fontFamily: "var(--ff-mono)", lineHeight: 1 }}>
                                  {evtCount > 1 ? evtCount : ""}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="r mono blur-sensitive" style={{ fontSize: 10.5, fontWeight: 500, color: "var(--text)" }}>
                        {monthSums[mi] > 0 ? fmt.money(monthSums[mi], "EUR", { dec: 0 }) : <span className="dim">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Right: Next month detail */}
          <Panel title="May 21 → Jun 30 · all events" tag={`${nextEvents.length} payments`} flush>
            <div style={{ height: "100%", overflow: "auto" }}>
              <table className="t" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>DATE</th>
                    <th>TICKER</th>
                    <th>NAME</th>
                    <th className="r">GROSS</th>
                    <th className="r">€</th>
                    <th className="c">WTH</th>
                    <th className="r">NET €</th>
                  </tr>
                </thead>
                <tbody>
                  {nextEvents.map((e, i) => {
                    const isPast = e.mo === today.mo && e.day < today.day;
                    const dist = (e.mo - today.mo) * 30 + (e.day - today.day);
                    const isUpcoming = dist >= 0 && dist <= 7;
                    return (
                      <tr key={i} className={isUpcoming ? "row-sel" : ""}>
                        <td className="l mono" style={{ fontSize: 10, color: isUpcoming ? "var(--accent)" : "var(--text-2)" }}>
                          {monthNames[e.mo - 1].slice(0, 3)} {String(e.day).padStart(2, "0")}
                        </td>
                        <td className="l" style={{ fontWeight: 600 }}>{e.t}</td>
                        <td className="l dim" style={{ fontSize: 10 }}>{e.n.slice(0, 14)}</td>
                        <td className="r blur-sensitive" style={{ fontSize: 10 }}>{e.grossLocal.toFixed(2)} <span className="dim">{e.ccy}</span></td>
                        <td className="r blur-sensitive">{fmt.money(e.grossEUR, "EUR", { dec: 2 })}</td>
                        <td className="c dim" style={{ fontSize: 9.5 }}>{(e.wth * 100).toFixed(0)}%</td>
                        <td className="r blur-sensitive" style={{ color: "var(--accent)" }}>{fmt.money(e.grossEUR * (1 - e.wth), "EUR", { dec: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="l" style={{ fontWeight: 600, color: "var(--muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 10px", background: "var(--bg-sub)" }}>Σ NEXT 40 DAYS</td>
                    <td className="r" style={{ background: "var(--bg-sub)" }}></td>
                    <td className="r blur-sensitive" style={{ background: "var(--bg-sub)", fontWeight: 600 }}>{fmt.money(nextEvents.reduce((s, e) => s + e.grossEUR, 0), "EUR", { dec: 2 })}</td>
                    <td className="r" style={{ background: "var(--bg-sub)" }}></td>
                    <td className="r blur-sensitive" style={{ background: "var(--bg-sub)", fontWeight: 600, color: "var(--accent)" }}>{fmt.money(nextEvents.reduce((s, e) => s + e.grossEUR * (1 - e.wth), 0), "EUR", { dec: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, { CalendarScreen });
