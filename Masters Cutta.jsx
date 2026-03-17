import { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";

// American odds → raw implied probability (decimal, not %)
function oddsToRaw(odds) {
  const o = Number(odds);
  if (!o || isNaN(o)) return 0;
  if (o > 0) return 100 / (o + 100);
  return Math.abs(o) / (Math.abs(o) + 100);
}

const DEFAULT_PAYOUTS = [
  { id: "p1",  label: "1st",               pct: 20 },
  { id: "p2",  label: "2nd",               pct: 14 },
  { id: "p3",  label: "3rd",               pct: 10 },
  { id: "p4",  label: "4th",               pct: 6 },
  { id: "p5",  label: "5th",               pct: 3.5 },
  { id: "p6",  label: "6th",               pct: 1.5 },
  { id: "p7",  label: "7th",               pct: 1.5 },
  { id: "p8",  label: "8th",               pct: 1.5 },
  { id: "p9",  label: "9th",               pct: 1.5 },
  { id: "p10", label: "10th",              pct: 1.5 },
  { id: "p11", label: "11th",              pct: 1.0 },
  { id: "p12", label: "12th",              pct: 1.0 },
  { id: "p13", label: "13th",              pct: 1.0 },
  { id: "p14", label: "14th",              pct: 1.0 },
  { id: "p15", label: "15th",              pct: 1.0 },
  { id: "p16", label: "Low Round",         pct: 2.5 },
  { id: "p17", label: "High Round",        pct: 1.0 },
  { id: "p18", label: "Worst Hole to Par", pct: 2.0 },
  { id: "p19", label: "Eagles",            pct: 16.0 },
  { id: "p20", label: "HIOs",              pct: 3.0 },
  { id: "p21", label: "R1 Leader",         pct: 2.0 },
  { id: "p22", label: "R2 Leader",         pct: 3.0 },
  { id: "p23", label: "R3 Leader",         pct: 4.0 },
];

// Build a default probs map for a player given their win odds
// For finish positions: scale proportionally from win prob
// For special categories: use win prob as a rough proxy (user can override)
function defaultProbs(odds, payouts) {
  const winRaw = oddsToRaw(odds);
  const probs = {};
  payouts.forEach(p => {
    // finish positions get progressively smaller probs
    const pos = parseInt(p.id.replace("p",""));
    if (pos <= 15) {
      // rough model: prob of finishing at position k ≈ winProb * decay
      const decay = Math.pow(0.75, pos - 1);
      probs[p.id] = Math.min(100, winRaw * decay * 100);
    } else {
      // special categories: use win prob as starting point
      probs[p.id] = Math.min(100, winRaw * 100);
    }
  });
  return probs;
}

const DEFAULT_PLAYERS = [
  { id: 1,  name: "Scottie Scheffler",   odds: -950,  bid: 0 },
  { id: 2,  name: "Rory McIlroy",        odds: 700,   bid: 0 },
  { id: 3,  name: "Jon Rahm",            odds: 1400,  bid: 0 },
  { id: 4,  name: "Collin Morikawa",     odds: 1600,  bid: 0 },
  { id: 5,  name: "Ludvig Aberg",        odds: 1800,  bid: 0 },
  { id: 6,  name: "Bryson DeChambeau",   odds: 2000,  bid: 0 },
  { id: 7,  name: "Xander Schauffele",   odds: 2000,  bid: 0 },
  { id: 8,  name: "Shane Lowry",         odds: 2200,  bid: 0 },
  { id: 9,  name: "Justin Thomas",       odds: 2500,  bid: 0 },
  { id: 10, name: "Hideki Matsuyama",    odds: 3000,  bid: 0 },
].map(p => ({ ...p, probs: defaultProbs(p.odds, DEFAULT_PAYOUTS) }));

const STORAGE_KEY = "auction_app_v3";
function loadState() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch (e) {}
  return { players: DEFAULT_PLAYERS, payouts: DEFAULT_PAYOUTS, poolMultiplier: 1 };
}
function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
}

function fmt(n) {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) return "—";
  return "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtOdds(o) {
  const n = Number(o);
  if (!n) return "—";
  return n > 0 ? `+${n}` : `${n}`;
}
function fmtPct(n, decimals = 1) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return (n >= 0 ? "+" : "") + n.toFixed(decimals) + "%";
}

// Calculate a player's total implied value across all payout categories
function calcImpliedValue(player, payouts, projectedPool) {
  return payouts.reduce((sum, payout) => {
    const prob = (Number((player.probs || {})[payout.id]) || 0) / 100;
    const payoutDollars = (payout.pct / 100) * projectedPool;
    return sum + prob * payoutDollars;
  }, 0);
}

// For pool projection, use total implied value share relative to all players
function calcShareOfPool(player, allPlayers, payouts, projectedPool) {
  const myVal = calcImpliedValue(player, payouts, projectedPool);
  const totalVal = allPlayers.reduce((s, p) => s + calcImpliedValue(p, payouts, projectedPool), 0);
  return totalVal > 0 ? myVal / totalVal : 0;
}

export default function AuctionApp() {
  const saved = loadState();
  const [players, setPlayers] = useState(saved.players);
  const [payouts, setPayouts] = useState(saved.payouts);
  const [poolMultiplier, setPoolMultiplier] = useState(saved.poolMultiplier ?? 1);
  const [tab, setTab] = useState("auction");
  const [newPlayer, setNewPlayer] = useState({ name: "", odds: "", bid: "" });
  const [newPayout, setNewPayout] = useState({ label: "", pct: "" });
  const [oddsViewPlayer, setOddsViewPlayer] = useState(null); // player id being expanded

  const persist = (p, py, pm) => saveState({ players: p, payouts: py, poolMultiplier: pm });
  const payoutTotal = useMemo(() => payouts.reduce((s, p) => s + (Number(p.pct) || 0), 0), [payouts]);

  // Project the pool using actual bids + estimated bids for unsold players
  // Estimate uses each player's share of implied value as a proxy for their bid
  const { totalBids, projectedPool, marketRate } = useMemo(() => {
    const sold = players.filter(p => Number(p.bid) > 0);
    const totalBids = sold.reduce((s, p) => s + Number(p.bid), 0);

    // Use a rough initial pool estimate = totalBids / sold share of total implied value
    // We iterate once to get a stable pool estimate
    const roughPool = totalBids > 0 ? totalBids * (players.length / Math.max(sold.length, 1)) : 50000;
    const totalImplied = players.reduce((s, p) => s + calcImpliedValue(p, payouts, roughPool), 0);
    const soldImplied = sold.reduce((s, p) => s + calcImpliedValue(p, payouts, roughPool), 0);
    const marketRate = soldImplied > 0 ? totalBids / soldImplied : 0;
    const unsoldEstimate = players.filter(p => !(Number(p.bid) > 0))
      .reduce((s, p) => s + calcImpliedValue(p, payouts, roughPool) * marketRate / (roughPool || 1) * roughPool, 0);
    // simpler: estimate unsold = their implied share * marketRate
    const unsoldEst2 = players.filter(p => !(Number(p.bid) > 0))
      .reduce((s, p) => {
        const share = totalImplied > 0 ? calcImpliedValue(p, payouts, roughPool) / totalImplied : 0;
        return s + share * (totalBids / (soldImplied / totalImplied || 1));
      }, 0);
    const projectedPool = (totalBids + (soldImplied > 0 ? (totalBids / soldImplied) * (totalImplied - soldImplied) : 0)) * poolMultiplier;
    return { totalBids, projectedPool: projectedPool || roughPool, marketRate };
  }, [players, payouts, poolMultiplier]);

  const enriched = useMemo(() => players.map(p => {
    const bid = Number(p.bid) || 0;
    const impliedValue = calcImpliedValue(p, payouts, projectedPool);
    const gl = bid > 0 ? impliedValue - bid : null;
    const glPct = bid > 0 ? ((impliedValue - bid) / bid) * 100 : null;
    // estimated bid for unsold: their implied value share * market rate proxy
    const totalImplied = players.reduce((s, pl) => s + calcImpliedValue(pl, payouts, projectedPool), 0);
    const myShare = totalImplied > 0 ? impliedValue / totalImplied : 0;
    const estimatedBid = marketRate > 0 && bid === 0 ? myShare * (totalBids / (1 - myShare + 0.0001)) : null;
    return { ...p, bid, impliedValue, gl, glPct, estimatedBid };
  }).sort((a, b) => b.impliedValue - a.impliedValue), [players, payouts, projectedPool, marketRate, totalBids]);

  const updatePlayer = (id, field, val) => {
    const updated = players.map(p => p.id === id ? { ...p, [field]: val } : p);
    setPlayers(updated); persist(updated, payouts, poolMultiplier);
  };
  const updatePlayerProb = (playerId, payoutId, val) => {
    const updated = players.map(p => p.id === playerId
      ? { ...p, probs: { ...p.probs, [payoutId]: val } }
      : p);
    setPlayers(updated); persist(updated, payouts, poolMultiplier);
  };
  const addPlayer = () => {
    if (!newPlayer.name) return;
    const np = { id: Date.now(), name: newPlayer.name, odds: Number(newPlayer.odds) || 0, bid: Number(newPlayer.bid) || 0 };
    np.probs = defaultProbs(np.odds, payouts);
    const updated = [...players, np];
    setPlayers(updated); persist(updated, payouts, poolMultiplier);
    setNewPlayer({ name: "", odds: "", bid: "" });
  };
  const removePlayer = (id) => {
    const updated = players.filter(p => p.id !== id);
    setPlayers(updated); persist(updated, payouts, poolMultiplier);
  };
  const updatePayout = (idx, field, val) => {
    const updated = payouts.map((p, i) => i === idx ? { ...p, [field]: val } : p);
    setPayouts(updated); persist(players, updated, poolMultiplier);
  };
  const addPayout = () => {
    if (!newPayout.label) return;
    const newId = "p" + Date.now();
    const updated = [...payouts, { id: newId, label: newPayout.label, pct: Number(newPayout.pct) || 0 }];
    setPayouts(updated); persist(players, updated, poolMultiplier);
    setNewPayout({ label: "", pct: "" });
  };
  const removePayout = (idx) => {
    const updated = payouts.filter((_, i) => i !== idx);
    setPayouts(updated); persist(players, updated, poolMultiplier);
  };
  const updateMultiplier = (val) => { setPoolMultiplier(val); persist(players, payouts, val); };

  const glColor = (v) => v === null ? "#94a3b8" : v >= 0 ? "#16a34a" : "#dc2626";

  const fileInputRef = useRef(null);
  const [uploadMsg, setUploadMsg] = useState("");

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        // Skip header row if first cell looks like a label
        const dataRows = rows.filter((r, i) => {
          if (i === 0 && isNaN(Number(r[1])) && typeof r[0] === "string" && isNaN(Number(r[0]))) return false;
          return r[0] && r[1] !== undefined && r[1] !== "";
        });
        if (dataRows.length === 0) { setUploadMsg("⚠ No data found. Expected columns: Name | Odds"); return; }
        const newPlayers = dataRows.map((r, i) => {
          const name = String(r[0]).trim();
          const odds = Number(r[1]);
          return {
            id: Date.now() + i,
            name,
            odds,
            bid: 0,
            probs: defaultProbs(odds, payouts),
          };
        });
        setPlayers(newPlayers);
        persist(newPlayers, payouts, poolMultiplier);
        setUploadMsg(`✓ Loaded ${newPlayers.length} players`);
        setTimeout(() => setUploadMsg(""), 3000);
      } catch (err) {
        setUploadMsg("⚠ Error reading file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };
  const soldCount = players.filter(p => Number(p.bid) > 0).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", fontFamily: "'Lora', Georgia, serif", color: "#1a1a2e" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        input { font-family: 'DM Mono', monospace; }
        input::placeholder { color: #b0a99a; }
        input:focus { outline: none; border-color: #8b6f47 !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #d4c4b0; border-radius: 2px; }
        .row-hover:hover { background: #f0ede8 !important; }
        .tab-btn { background: none; border: none; cursor: pointer; font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; padding: 8px 20px; color: #8b8070; border-bottom: 2px solid transparent; transition: all 0.15s; }
        .tab-btn:hover { color: #f8f7f4; }
        .prob-input { width: 52px; text-align: right; background: transparent; border: 1px solid transparent; border-radius: 3px; padding: 2px 4px; font-size: 11px; font-family: 'DM Mono', monospace; color: #1a1a2e; }
        .prob-input:hover { border-color: #d4c4b0; }
        .prob-input:focus { border-color: #8b6f47 !important; background: #fff; outline: none; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#1a1a2e", padding: "28px 40px 0", color: "#f8f7f4" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8b8070", fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>Masters Auction Calculator</div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>Cutta Pool Analyzer</h1>
            </div>
            <div style={{ display: "flex", gap: 28, textAlign: "right", alignItems: "flex-start" }}>
              <div>
                <div style={statLabel}>Bids In</div>
                <div style={statVal("#f0c060")}>{fmt(totalBids)}</div>
                <div style={statSub}>{soldCount} of {players.length} sold</div>
              </div>
              <div>
                <div style={statLabel}>Projected Pool</div>
                <div style={statVal("#6fcf97")}>{fmt(projectedPool)}</div>
                <div style={statSub}>incl. est. unsold</div>
              </div>
              <div>
                <div style={statLabel}>Multiplier</div>
                <input type="number" step="0.1" min="0.1" value={poolMultiplier}
                  onChange={e => updateMultiplier(Number(e.target.value))}
                  style={{ width: 70, background: "#2d2d4e", border: "1px solid #3d3d5e", borderRadius: 4, color: "#f8f7f4", padding: "4px 8px", fontSize: 18, fontWeight: 600, textAlign: "center", fontFamily: "'DM Mono', monospace" }} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", borderBottom: "1px solid #2d2d4e" }}>
            {[["auction","Auction"], ["payouts","Payout Structure"], ["odds","Odds & Probabilities"]].map(([key, label]) => (
              <button key={key} className="tab-btn" onClick={() => setTab(key)}
                style={{ color: tab === key ? "#f8f7f4" : "#8b8070", borderBottomColor: tab === key ? "#f0c060" : "transparent" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 40px" }}>

        {/* AUCTION TAB */}
        {tab === "auction" && (
          <div>
            <div style={{ background: "#fff", border: "1px solid #e8e0d4", borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f0ede8" }}>
                    {["#", "Player / Team", "Odds", "Bid Paid", "Implied Value", "G / L ($)", "G / L (%)", ""].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enriched.map((p, i) => (
                    <tr key={p.id} className="row-hover" style={{ borderBottom: "1px solid #f0ede8", background: i % 2 === 0 ? "#fff" : "#fdfcfa" }}>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontSize: 12, color: "#b0a99a", fontFamily: "'DM Mono', monospace" }}>{i + 1}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 600, fontSize: 14, minWidth: 180 }}>{p.name}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#8b8070" }}>{fmtOdds(p.odds)}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 11, color: "#b0a99a" }}>$</span>
                          <input type="number" value={p.bid || ""} placeholder={p.estimatedBid ? Math.round(p.estimatedBid) : "0"}
                            onChange={e => updatePlayer(p.id, "bid", Number(e.target.value))}
                            style={{ ...inlineInput, width: 80, textAlign: "right" }} />
                        </div>
                        {p.bid <= 0 && p.estimatedBid > 0 && (
                          <div style={{ fontSize: 10, color: "#b0a99a", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>est. {fmt(p.estimatedBid)}</div>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600 }}>{fmt(p.impliedValue)}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: glColor(p.gl) }}>
                        {p.gl !== null ? (p.gl >= 0 ? "+" : "-") + fmt(p.gl).replace("$","") : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: glColor(p.glPct) }}>
                        {p.glPct !== null ? fmtPct(p.glPct) : "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <button onClick={() => removePlayer(p.id)} style={{ background: "none", border: "none", color: "#d4c4b0", cursor: "pointer", fontSize: 14 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f0ede8", borderTop: "2px solid #e8e0d4" }}>
                    <td colSpan={3} style={{ padding: "10px 14px", fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#8b8070", textTransform: "uppercase", letterSpacing: "0.08em" }}>{players.length} players</td>
                    <td style={{ padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700 }}>{fmt(totalBids)}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700 }}>{fmt(projectedPool)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div><div style={labelStyle}>Player / Team Name</div>
                <input placeholder="e.g. Scottie Scheffler" value={newPlayer.name} onChange={e => setNewPlayer(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addPlayer()} style={{ ...inputStyle, width: 260 }} /></div>
              <div><div style={labelStyle}>American Odds</div>
                <input placeholder="+500 or -110" value={newPlayer.odds} onChange={e => setNewPlayer(p => ({ ...p, odds: e.target.value }))}
                  style={{ ...inputStyle, width: 130 }} /></div>
              <div><div style={labelStyle}>Auction Bid ($)</div>
                <input type="number" placeholder="0" value={newPlayer.bid} onChange={e => setNewPlayer(p => ({ ...p, bid: e.target.value }))}
                  style={{ ...inputStyle, width: 110 }} /></div>
              <button onClick={addPlayer} style={addBtnStyle}>+ Add Player</button>
            </div>
            <div style={{ marginTop: 14, padding: "12px 16px", background: "#fff8ee", border: "1px solid #f0d080", borderRadius: 8, fontSize: 12, color: "#8b6f47", fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
              <strong>How it works:</strong> Implied Value = Σ (probability of winning each category × $ payout for that category). Edit per-player probabilities in the <strong>Odds & Probabilities</strong> tab.
            </div>
          </div>
        )}

        {/* PAYOUTS TAB */}
        {tab === "payouts" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-end" }}>
              <div><div style={labelStyle}>Position Label</div>
                <input placeholder="e.g. 1st" value={newPayout.label} onChange={e => setNewPayout(p => ({ ...p, label: e.target.value }))}
                  style={{ ...inputStyle, width: 160 }} /></div>
              <div><div style={labelStyle}>% of Pool</div>
                <input type="number" placeholder="5.0" value={newPayout.pct} onChange={e => setNewPayout(p => ({ ...p, pct: e.target.value }))}
                  style={{ ...inputStyle, width: 100 }} /></div>
              <button onClick={addPayout} style={addBtnStyle}>+ Add Row</button>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e8e0d4", borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f0ede8" }}>
                    {["Category", "% of Pool", `$ at ${fmt(projectedPool)}`, ""].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p, i) => (
                    <tr key={p.id} className="row-hover" style={{ borderBottom: "1px solid #f0ede8" }}>
                      <td style={{ padding: "8px 16px" }}>
                        <input value={p.label} onChange={e => updatePayout(i, "label", e.target.value)} style={{ ...inlineInput, width: 160 }} />
                      </td>
                      <td style={{ padding: "8px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input type="number" value={p.pct} onChange={e => updatePayout(i, "pct", Number(e.target.value))}
                            style={{ ...inlineInput, width: 80, textAlign: "right" }} />
                          <span style={{ fontSize: 11, color: "#b0a99a" }}>%</span>
                          <div style={{ flex: 1, height: 4, background: "#e8e0d4", borderRadius: 2 }}>
                            <div style={{ width: `${Math.min(100, (p.pct / 20) * 100)}%`, height: "100%", background: "#8b6f47", borderRadius: 2 }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "8px 16px", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600 }}>
                        {fmt((p.pct / 100) * projectedPool)}
                      </td>
                      <td style={{ padding: "8px 16px" }}>
                        <button onClick={() => removePayout(i)} style={{ background: "none", border: "none", color: "#d4c4b0", cursor: "pointer", fontSize: 14 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f0ede8", borderTop: "2px solid #e8e0d4" }}>
                    <td style={{ padding: "10px 16px", fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#8b8070", textTransform: "uppercase", letterSpacing: "0.08em" }}>Total</td>
                    <td style={{ padding: "10px 16px", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: Math.abs(payoutTotal - 99.5) < 0.1 ? "#16a34a" : "#dc2626" }}>{payoutTotal.toFixed(1)}%</td>
                    <td style={{ padding: "10px 16px", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700 }}>{fmt((payoutTotal / 100) * projectedPool)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            {Math.abs(payoutTotal - 99.5) > 0.1 && (
              <div style={{ marginTop: 10, padding: "10px 14px", background: "#fff8ee", border: "1px solid #f0d080", borderRadius: 6, fontSize: 12, color: "#8b6f47", fontFamily: "'DM Mono', monospace" }}>
                ⚠ Payouts sum to {payoutTotal.toFixed(1)}% — expected 99.5% (0.5% rake).
              </div>
            )}
            <div style={{ marginTop: 8, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, fontSize: 12, color: "#166534", fontFamily: "'DM Mono', monospace" }}>
              ✓ 0.5% rake applied — payouts target 99.5% of pool. Rake = {fmt(projectedPool * 0.005)}
            </div>
          </div>
        )}

        {/* ODDS & PROBABILITIES TAB — matrix of players × payout categories */}
        {tab === "odds" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1, padding: "12px 16px", background: "#fff", border: "1px solid #e8e0d4", borderRadius: 8, fontSize: 12, color: "#8b8070", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                Each cell = probability (%) that this player wins that payout category. Edit any cell directly.
                The <strong>Implied Value</strong> column = Σ (prob × $ payout) across all categories at the current projected pool of <strong>{fmt(projectedPool)}</strong>.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
                <div style={{ padding: "12px 16px", background: "#fff", border: "2px dashed #e8e0d4", borderRadius: 8, textAlign: "center", cursor: "pointer" }}
                  onClick={() => fileInputRef.current.click()}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>📊</div>
                  <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "'DM Mono', monospace", color: "#1a1a2e" }}>Upload Excel / CSV</div>
                  <div style={{ fontSize: 11, color: "#b0a99a", fontFamily: "'DM Mono', monospace", marginTop: 4 }}>2 columns: Name | Odds</div>
                  <div style={{ fontSize: 10, color: "#b0a99a", fontFamily: "'DM Mono', monospace" }}>e.g. "Scottie Scheffler" | -950</div>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} style={{ display: "none" }} />
                </div>
                {uploadMsg && (
                  <div style={{ padding: "8px 12px", background: uploadMsg.startsWith("✓") ? "#f0fdf4" : "#fff8ee", border: `1px solid ${uploadMsg.startsWith("✓") ? "#bbf7d0" : "#f0d080"}`, borderRadius: 6, fontSize: 12, color: uploadMsg.startsWith("✓") ? "#166534" : "#8b6f47", fontFamily: "'DM Mono', monospace" }}>
                    {uploadMsg}
                  </div>
                )}
                <a href="data:text/csv;charset=utf-8,Name,Odds%0AScottie%20Scheffler,-950%0ARory%20McIlroy,700%0AJon%20Rahm,1400"
                  download="cutta_odds_template.csv"
                  style={{ textAlign: "center", fontSize: 11, color: "#8b6f47", fontFamily: "'DM Mono', monospace", textDecoration: "none" }}>
                  ↓ Download template CSV
                </a>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: 12, whiteSpace: "nowrap" }}>
                <thead>
                  <tr style={{ background: "#1a1a2e", color: "#f8f7f4" }}>
                    <th style={{ ...thStyle, color: "#f8f7f4", background: "#1a1a2e", position: "sticky", left: 0, zIndex: 2, minWidth: 160, borderBottom: "none" }}>Player</th>
                    <th style={{ ...thStyle, color: "#f8f7f4", background: "#1a1a2e", borderBottom: "none", minWidth: 80 }}>Odds</th>
                    {payouts.map(po => (
                      <th key={po.id} style={{ ...thStyle, color: "#f8f7f4", background: "#1a1a2e", borderBottom: "none", minWidth: 72, textAlign: "center" }}>
                        <div>{po.label}</div>
                        <div style={{ color: "#8b8070", fontSize: 9, fontWeight: 400 }}>{po.pct}%</div>
                      </th>
                    ))}
                    <th style={{ ...thStyle, color: "#f0c060", background: "#1a1a2e", borderBottom: "none", minWidth: 110 }}>Impl. Value</th>
                  </tr>
                  <tr style={{ background: "#2d2d4e" }}>
                    <td style={{ padding: "4px 14px", fontSize: 10, color: "#8b8070", fontFamily: "'DM Mono', monospace", position: "sticky", left: 0, background: "#2d2d4e" }}>payout →</td>
                    <td style={{ padding: "4px 14px" }} />
                    {payouts.map(po => (
                      <td key={po.id} style={{ padding: "4px 8px", textAlign: "center", fontSize: 10, color: "#6fcf97", fontFamily: "'DM Mono', monospace" }}>
                        {fmt((po.pct / 100) * projectedPool)}
                      </td>
                    ))}
                    <td />
                  </tr>
                </thead>
                <tbody>
                  {[...players].sort((a, b) => {
                    const va = calcImpliedValue(a, payouts, projectedPool);
                    const vb = calcImpliedValue(b, payouts, projectedPool);
                    return vb - va;
                  }).map((p, i) => {
                    const impliedValue = calcImpliedValue(p, payouts, projectedPool);
                    return (
                      <tr key={p.id} className="row-hover" style={{ borderBottom: "1px solid #f0ede8", background: i % 2 === 0 ? "#fff" : "#fdfcfa" }}>
                        <td style={{ padding: "8px 14px", fontWeight: 600, fontSize: 13, position: "sticky", left: 0, background: i % 2 === 0 ? "#fff" : "#fdfcfa", zIndex: 1, borderRight: "1px solid #e8e0d4" }}>
                          <div>{p.name}</div>
                          <input value={p.odds} onChange={e => {
                            updatePlayer(p.id, "odds", e.target.value);
                            // auto-refresh default probs when odds change
                            const newProbs = defaultProbs(e.target.value, payouts);
                            const updated = players.map(pl => pl.id === p.id
                              ? { ...pl, odds: e.target.value, probs: { ...newProbs, ...pl.probs } }
                              : pl);
                            setPlayers(updated); persist(updated, payouts, poolMultiplier);
                          }}
                            style={{ ...inlineInput, fontSize: 11, width: 80, color: "#8b8070", marginTop: 2 }}
                            placeholder="odds" />
                        </td>
                        <td style={{ padding: "8px 14px", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#8b8070" }}>{fmtOdds(p.odds)}</td>
                        {payouts.map(po => {
                          const prob = Number((p.probs || {})[po.id]) || 0;
                          const contribution = (prob / 100) * (po.pct / 100) * projectedPool;
                          const intensity = Math.min(1, prob / 30);
                          return (
                            <td key={po.id} style={{ padding: "4px 6px", textAlign: "center", background: prob > 0 ? `rgba(139,111,71,${intensity * 0.15})` : "transparent" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                                <input
                                  className="prob-input"
                                  type="number" min="0" max="100" step="0.1"
                                  value={prob || ""}
                                  placeholder="0"
                                  onChange={e => updatePlayerProb(p.id, po.id, Number(e.target.value))}
                                />
                                <span style={{ fontSize: 10, color: "#b0a99a" }}>%</span>
                              </div>
                              {contribution > 0 && (
                                <div style={{ fontSize: 9, color: "#8b6f47", fontFamily: "'DM Mono', monospace", marginTop: 1 }}>
                                  {fmt(contribution)}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ padding: "8px 14px", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>
                          {fmt(impliedValue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f0ede8", borderTop: "2px solid #e8e0d4" }}>
                    <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#8b8070", textTransform: "uppercase", letterSpacing: "0.08em", position: "sticky", left: 0, background: "#f0ede8" }}>
                      Σ prob per category
                    </td>
                    <td />
                    {payouts.map(po => {
                      const colTotal = players.reduce((s, pl) => s + (Number((pl.probs || {})[po.id]) || 0), 0);
                      return (
                        <td key={po.id} style={{ padding: "8px 6px", textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600, color: Math.abs(colTotal - 100) < 5 ? "#16a34a" : "#8b8070" }}>
                          {colTotal.toFixed(0)}%
                        </td>
                      );
                    })}
                    <td style={{ padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700 }}>
                      {fmt(players.reduce((s, p) => s + calcImpliedValue(p, payouts, projectedPool), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div style={{ marginTop: 10, padding: "10px 14px", background: "#fff8ee", border: "1px solid #f0d080", borderRadius: 6, fontSize: 12, color: "#8b6f47", fontFamily: "'DM Mono', monospace" }}>
              💡 Column totals should sum to ~100% for finish positions (one winner), and can exceed 100% for categories like Eagles or HIOs where multiple players can score.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const statLabel = { fontSize: 11, color: "#8b8070", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 };
const statSub = { fontSize: 10, color: "#8b8070", fontFamily: "'DM Mono', monospace", marginTop: 3 };
const statVal = (color) => ({ fontSize: 22, fontWeight: 600, fontFamily: "'DM Mono', monospace", color });
const thStyle = { padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8b8070", fontFamily: "'DM Mono', monospace", borderBottom: "1px solid #e8e0d4" };
const labelStyle = { fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8b8070", fontFamily: "'DM Mono', monospace", marginBottom: 4 };
const inputStyle = { background: "#fff", border: "1px solid #e8e0d4", borderRadius: 6, color: "#1a1a2e", padding: "8px 12px", fontSize: 13, fontFamily: "'DM Mono', monospace" };
const inlineInput = { background: "transparent", border: "1px solid transparent", borderRadius: 4, color: "inherit", padding: "3px 6px", fontSize: 13, fontFamily: "'DM Mono', monospace", cursor: "text" };
const addBtnStyle = { background: "#1a1a2e", border: "none", borderRadius: 6, color: "#f8f7f4", padding: "9px 18px", fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" };
