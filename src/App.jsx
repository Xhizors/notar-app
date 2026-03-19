import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const DOC_OPTIONS = [
  "Buletin",
  "Fiscal",
  "Act dobandire",
  "IBAN",
  "Certificat casatorie",
  "Procura",
  "Extras CF",
  "Certificat energetic",
  "Altele",
];

const STATUS_OPTIONS = ["programat", "lipsa acte", "avans platit", "tranzactionat"];
const TYPE_OPTIONS = ["avans", "final"];
const AGENT_OPTIONS = ["Paul Pojar", "Alex Oltean", "Paul + Alex"];
const CURRENCY_OPTIONS = ["EUR", "RON"];
const COMMISSION_TYPE_OPTIONS = ["Procent", "Pret/mp", "Suma fixa"];
const COMMISSION_PAYMENT_STATUS_OPTIONS = ["Achitat", "Achitat partial", "Neachitat"];

const STATUS_COLORS = {
  programat: { background: "#dbeafe", color: "#1d4ed8", border: "1px solid #93c5fd" },
  "lipsa acte": { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" },
  "avans platit": { background: "#ede9fe", color: "#6d28d9", border: "1px solid #c4b5fd" },
  tranzactionat: { background: "#dcfce7", color: "#15803d", border: "1px solid #86efac" },
};

const TYPE_COLORS = {
  avans: { background: "#dbeafe", color: "#1d4ed8", border: "1px solid #93c5fd" },
  final: { background: "#dcfce7", color: "#15803d", border: "1px solid #86efac" },
};

const LAYOUT = {
  pageMaxWidth: 1680,
  leftCol: 430,
};

function sectionStyle() {
  return {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  };
}

function inputStyle() {
  return {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    fontSize: 14,
    boxSizing: "border-box",
  };
}

function labelStyle() {
  return {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
  };
}

function buttonStyle(primary = false) {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: primary ? "1px solid #111827" : "1px solid #d1d5db",
    background: primary ? "#111827" : "white",
    color: primary ? "white" : "#111827",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  };
}

function createDocs() {
  return Object.fromEntries(DOC_OPTIONS.map((d) => [d, false]));
}

function emptyParty(name = "") {
  return {
    id: crypto.randomUUID(),
    name,
    notes: "",
    docs: createDocs(),
  };
}

function emptyDeal() {
  return {
    agent: "Paul Pojar",
    id: crypto.randomUUID(),
    title: "Tranzactie noua",
    status: "programat",
    type: "avans",
    advanceDateTime: "",
    finalDateTime: "",
    sellers: [emptyParty("Vanzator 1")],
    buyers: [emptyParty("Cumparator 1")],
    area: "",
    price: "",
    priceCurrency: "EUR",
    advanceAmount: "",
    advanceCurrency: "EUR",
    sellerCommissionType: "Procent",
    sellerCommissionValue: "2",
    buyerCommissionType: "Procent",
    buyerCommissionValue: "2",
    sellerCommissionPaymentStatus: "Neachitat",
    sellerCommissionPaidAmount: "",
    buyerCommissionPaymentStatus: "Neachitat",
    buyerCommissionPaidAmount: "",
    notes: "",
  };
}

function seedDeal() {
  return {
    agent: "Paul + Alex",
    id: crypto.randomUUID(),
    title: "Jucu - teren 1500 mp",
    status: "lipsa acte",
    type: "avans",
    advanceDateTime: "2026-03-21T11:00",
    finalDateTime: "2026-03-28T14:00",
    sellers: [
      {
        id: crypto.randomUUID(),
        name: "Vanzator 1",
        notes: "Aduce fiscalul maine dimineata.",
        docs: { ...createDocs(), Buletin: true, Fiscal: true, "Act dobandire": true },
      },
      {
        id: crypto.randomUUID(),
        name: "Vanzator 2",
        notes: "Are nevoie de reminder pentru IBAN si fiscal.",
        docs: { ...createDocs(), Buletin: true, Fiscal: false, "Act dobandire": true, IBAN: true },
      },
    ],
    buyers: [
      {
        id: crypto.randomUUID(),
        name: "Cumparator 1",
        notes: "Confirma ora exacta dupa-amiaza.",
        docs: { ...createDocs(), Buletin: true, IBAN: true },
      },
    ],
    area: 1500,
    price: 120000,
    priceCurrency: "EUR",
    advanceAmount: 10000,
    advanceCurrency: "EUR",
    sellerCommissionType: "Pret/mp",
    sellerCommissionValue: 1,
    buyerCommissionType: "Procent",
    buyerCommissionValue: 2,
    sellerCommissionPaymentStatus: "Neachitat",
    sellerCommissionPaidAmount: "",
    buyerCommissionPaymentStatus: "Achitat partial",
    buyerCommissionPaidAmount: 1000,
    notes: "Lipseste fiscal la Vanzator 2.",
  };
}

function parseNumber(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const normalized = String(value).replace(/,/g, ".").trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  return Number(value).toLocaleString("ro-RO");
}

function calculateCommission(price, area, type, value) {
  const p = parseNumber(price);
  const a = parseNumber(area);
  const v = parseNumber(value);
  if (type === "Procent") return (p * v) / 100;
  if (type === "Pret/mp") return a * v;
  if (type === "Suma fixa") return v;
  return 0;
}

function missingDocs(party) {
  return DOC_OPTIONS.filter((doc) => !party.docs?.[doc]);
}

function completionStats(parties) {
  const total = parties.length * DOC_OPTIONS.length;
  const checked = parties.reduce((sum, p) => sum + DOC_OPTIONS.reduce((s, d) => s + (p.docs?.[d] ? 1 : 0), 0), 0);
  return { checked, total, pct: total ? Math.round((checked / total) * 100) : 0 };
}

function getCommissionWarnings(deal) {
  const warnings = [];
  if (deal.sellerCommissionPaymentStatus === "Neachitat") warnings.push("Vanzator - COMISION NEACHITAT");
  if (deal.sellerCommissionPaymentStatus === "Achitat partial") warnings.push("Vanzator - COMISION ACHITAT PARTIAL");
  if (deal.buyerCommissionPaymentStatus === "Neachitat") warnings.push("Cumparator - COMISION NEACHITAT");
  if (deal.buyerCommissionPaymentStatus === "Achitat partial") warnings.push("Cumparator - COMISION ACHITAT PARTIAL");
  return warnings;
}

function getDealWarnings(deal) {
  const warnings = [];
  if (!deal.advanceDateTime && deal.type === "avans") warnings.push("Nu este setata data si ora pentru avans.");
  if (!deal.finalDateTime && deal.type === "final") warnings.push("Nu este setata data si ora pentru contractul final.");
  if (!deal.price) warnings.push("Lipseste pretul tranzactiei.");
  if (!deal.area && (deal.sellerCommissionType === "Pret/mp" || deal.buyerCommissionType === "Pret/mp")) {
    warnings.push("Lipseste suprafata, dar unul dintre comisioane este calculat la mp.");
  }
  if (!deal.sellers.length) warnings.push("Nu exista niciun vanzator in tranzactie.");
  if (!deal.buyers.length) warnings.push("Nu exista niciun cumparator in tranzactie.");

  deal.sellers.forEach((seller, index) => {
    const missing = missingDocs(seller);
    if (missing.length) warnings.push(`Vanzator ${index + 1}${seller.name ? ` (${seller.name})` : ""} - lipsesc: ${missing.join(", ")}.`);
  });

  deal.buyers.forEach((buyer, index) => {
    const missing = missingDocs(buyer);
    if (missing.length) warnings.push(`Cumparator ${index + 1}${buyer.name ? ` (${buyer.name})` : ""} - lipsesc: ${missing.join(", ")}.`);
  });

  if (deal.status === "tranzactionat") {
    const hasMissing = [...deal.sellers, ...deal.buyers].some((party) => missingDocs(party).length > 0);
    if (hasMissing) warnings.push("Statusul este 'tranzactionat', dar exista acte lipsa.");
  }

  if (deal.status === "avans platit" && !parseNumber(deal.advanceAmount)) {
    warnings.push("Statusul este 'avans platit', dar suma avansului este goala sau 0.");
  }

  if (deal.sellerCommissionPaymentStatus === "Achitat partial" && !parseNumber(deal.sellerCommissionPaidAmount)) {
    warnings.push("Comisionul vanzatorului este setat ca 'Achitat partial', dar suma achitata lipseste.");
  }

  if (deal.buyerCommissionPaymentStatus === "Achitat partial" && !parseNumber(deal.buyerCommissionPaidAmount)) {
    warnings.push("Comisionul cumparatorului este setat ca 'Achitat partial', dar suma achitata lipseste.");
  }

  return warnings;
}

function formatMoney(value, currency) {
  const number = parseNumber(value);
  return `${number.toLocaleString("ro-RO", { maximumFractionDigits: 2 })} ${currency}`.trim();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ro-RO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function dealCompletion(deal) {
  const seller = completionStats(deal.sellers);
  const buyer = completionStats(deal.buyers);
  const checked = seller.checked + buyer.checked;
  const total = seller.total + buyer.total;
  return total ? Math.round((checked / total) * 100) : 0;
}

async function loadTransactions() {
  const { data, error } = await supabase.from("transactions").select("*").order("position", { ascending: true });
  if (error) {
    console.error("Eroare la incarcare:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    type: row.type,
    advanceDateTime: row.advance_datetime || "",
    finalDateTime: row.final_datetime || "",
    sellers: row.sellers || [],
    buyers: row.buyers || [],
    area: row.area ?? "",
    price: row.price_eur ?? "",
    priceCurrency: row.price_payment_currency || "EUR",
    advanceAmount: row.advance_amount ?? "",
    advanceCurrency: row.advance_currency || "EUR",
    sellerCommissionType: row.seller_commission_type || "Procent",
    sellerCommissionValue: row.seller_commission_value ?? "",
    buyerCommissionType: row.buyer_commission_type || "Procent",
    buyerCommissionValue: row.buyer_commission_value ?? "",
    sellerCommissionPaymentStatus: row.seller_commission_payment_status || "Neachitat",
    sellerCommissionPaidAmount: row.seller_commission_paid_amount ?? "",
    buyerCommissionPaymentStatus: row.buyer_commission_payment_status || "Neachitat",
    buyerCommissionPaidAmount: row.buyer_commission_paid_amount ?? "",
    notes: row.notes || "",
    agent: row.agent || "Paul Pojar",
  }));
}

async function saveTransactions(tranzactii) {
  const payload = tranzactii.map((deal, index) => ({
    id: deal.id,
    position: index,
    title: deal.title,
    status: deal.status,
    type: deal.type,
    advance_datetime: deal.advanceDateTime || null,
    final_datetime: deal.finalDateTime || null,
    area: deal.area || null,
    price_eur: deal.price || null,
    price_payment_currency: deal.priceCurrency || "EUR",
    advance_amount: deal.advanceAmount || null,
    advance_currency: deal.advanceCurrency || "EUR",
    seller_commission_type: deal.sellerCommissionType || "Procent",
    seller_commission_value: deal.sellerCommissionValue || null,
    buyer_commission_type: deal.buyerCommissionType || "Procent",
    buyer_commission_value: deal.buyerCommissionValue || null,
    seller_commission_payment_status: deal.sellerCommissionPaymentStatus || "Neachitat",
    seller_commission_paid_amount: deal.sellerCommissionPaidAmount || null,
    buyer_commission_payment_status: deal.buyerCommissionPaymentStatus || "Neachitat",
    buyer_commission_paid_amount: deal.buyerCommissionPaidAmount || null,
    sellers: deal.sellers || [],
    buyers: deal.buyers || [],
    notes: deal.notes || "",
    agent: deal.agent || "Paul Pojar",
  }));

  const { error } = await supabase.from("transactions").upsert(payload);
  if (error) console.error("Eroare la salvare:", error);
}

async function deleteTransactionFromDb(id) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) console.error("Eroare la stergere:", error);
}

function Section({ title, isOpen, onToggle, children, bg }) {
  return (
    <div style={{ ...sectionStyle(), background: bg || "white", flexShrink: 0 }}>
      <div onClick={onToggle} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: isOpen ? 12 : 0 }}>
        <h3 style={{ margin: 0, fontSize: 17 }}>{title}</h3>
        <button style={{ ...buttonStyle(false), padding: "6px 10px", fontSize: 12 }}>{isOpen ? "Inchide" : "Deschide"}</button>
      </div>
      {isOpen ? children : null}
    </div>
  );
}

export default function App() {
  const [tranzactii, setTranzactii] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [savedAt, setSavedAt] = useState("");
  const [statusFilter, setStatusFilter] = useState("toate");
  const [agentFilter, setAgentFilter] = useState("toate");
  const [commissionFilter, setCommissionFilter] = useState("toate");
  const [hidePaidCommissions, setHidePaidCommissions] = useState(false);
  const [sortOrder, setSortOrder] = useState("manual");
  const [sectionsOpen, setSectionsOpen] = useState({
    detalii: true,
    comision: false,
    warninguri: true,
    vanzatori: true,
    cumparatori: true,
  });

  useEffect(() => {
    async function init() {
      const rows = await loadTransactions();
      if (rows.length > 0) {
        setTranzactii(rows);
        setSelectedId(rows[0].id);
        return;
      }
      const seeded = [seedDeal()];
      setTranzactii(seeded);
      setSelectedId(seeded[0].id);
      await saveTransactions(seeded);
    }
    init();
  }, []);

  useEffect(() => {
    if (!tranzactii.length) return;
    async function persist() {
      await saveTransactions(tranzactii);
      setSavedAt(new Date().toLocaleString("ro-RO"));
    }
    persist();
  }, [tranzactii]);

  const selectedDeal = tranzactii.find((d) => d.id === selectedId) || null;

  useEffect(() => {
    if (!selectedDeal) return;
    setSectionsOpen((prev) => ({
      ...prev,
      comision: selectedDeal.status === "tranzactionat" ? true : prev.comision,
    }));
  }, [selectedDeal?.id, selectedDeal?.status]);

  const filteredDeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = tranzactii.filter((d) => {
      const matchesSearch = !q || [d.title, d.status, d.type, ...d.sellers.map((s) => s.name), ...d.buyers.map((b) => b.name), d.notes].join(" ").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "toate" || d.status === statusFilter;
      const matchesAgent = agentFilter === "toate" || d.agent === agentFilter;

      const hasUnpaid = d.sellerCommissionPaymentStatus === "Neachitat" || d.buyerCommissionPaymentStatus === "Neachitat";
      const hasPartial = d.sellerCommissionPaymentStatus === "Achitat partial" || d.buyerCommissionPaymentStatus === "Achitat partial";
      const hasCommissionIssues = hasUnpaid || hasPartial;
      const fullyPaid = d.sellerCommissionPaymentStatus === "Achitat" && d.buyerCommissionPaymentStatus === "Achitat";

      let matchesCommission = true;
      if (commissionFilter === "probleme comision") matchesCommission = hasCommissionIssues;
      if (commissionFilter === "neachitat") matchesCommission = hasUnpaid;
      if (commissionFilter === "achitat partial") matchesCommission = hasPartial;
      if (commissionFilter === "achitat") matchesCommission = fullyPaid;
      if (hidePaidCommissions && fullyPaid) return false;

      return matchesSearch && matchesStatus && matchesAgent && matchesCommission;
    });

    const sorted = [...filtered];
    if (sortOrder === "manual") return sorted;

    if (sortOrder === "cronologic_asc") {
      return sorted.sort((a, b) => {
        const dateA = a.type === "avans" ? a.advanceDateTime : a.finalDateTime;
        const dateB = b.type === "avans" ? b.advanceDateTime : b.finalDateTime;
        const timeA = dateA ? new Date(dateA).getTime() : Number.MAX_SAFE_INTEGER;
        const timeB = dateB ? new Date(dateB).getTime() : Number.MAX_SAFE_INTEGER;
        return timeA - timeB;
      });
    }

    if (sortOrder === "cronologic_desc") {
      return sorted.sort((a, b) => {
        const dateA = a.type === "avans" ? a.advanceDateTime : a.finalDateTime;
        const dateB = b.type === "avans" ? b.advanceDateTime : b.finalDateTime;
        const timeA = dateA ? new Date(dateA).getTime() : 0;
        const timeB = dateB ? new Date(dateB).getTime() : 0;
        return timeB - timeA;
      });
    }

    if (sortOrder === "status") {
      const priority = { "lipsa acte": 0, programat: 1, "avans platit": 2, tranzactionat: 3 };
      return sorted.sort((a, b) => {
        const diff = (priority[a.status] ?? 99) - (priority[b.status] ?? 99);
        if (diff !== 0) return diff;
        return (a.title || "").localeCompare(b.title || "", "ro");
      });
    }

    return sorted;
  }, [tranzactii, search, statusFilter, agentFilter, commissionFilter, hidePaidCommissions, sortOrder]);

  function updateDeal(id, patch) {
    setTranzactii((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function addDeal() {
    const deal = emptyDeal();
    setTranzactii((prev) => [deal, ...prev]);
    setSelectedId(deal.id);
  }

  function duplicateDeal() {
    if (!selectedDeal) return;
    const cloned = {
      ...selectedDeal,
      id: crypto.randomUUID(),
      title: `${selectedDeal.title} - copie`,
      sellers: selectedDeal.sellers.map((s) => ({ ...s, id: crypto.randomUUID() })),
      buyers: selectedDeal.buyers.map((b) => ({ ...b, id: crypto.randomUUID() })),
    };
    setTranzactii((prev) => [cloned, ...prev]);
    setSelectedId(cloned.id);
  }

  async function deleteDeal(id) {
    const next = tranzactii.filter((d) => d.id !== id);
    setTranzactii(next);
    setSelectedId(next[0]?.id || null);
    await deleteTransactionFromDb(id);
  }

  async function clearAllData() {
    const { error } = await supabase.from("transactions").delete().neq("id", "");
    if (error) {
      console.error("Eroare la reset:", error);
      return;
    }
    const seeded = [seedDeal()];
    setTranzactii(seeded);
    setSelectedId(seeded[0].id);
    await saveTransactions(seeded);
  }

  function addParty(type) {
    if (!selectedDeal) return;
    const list = type === "sellers" ? selectedDeal.sellers : selectedDeal.buyers;
    const label = type === "sellers" ? `Vanzator ${list.length + 1}` : `Cumparator ${list.length + 1}`;
    updateDeal(selectedDeal.id, { [type]: [...list, emptyParty(label)] });
  }

  function removeParty(type, partyId) {
    if (!selectedDeal) return;
    updateDeal(selectedDeal.id, { [type]: selectedDeal[type].filter((p) => p.id !== partyId) });
  }

  function updateParty(type, partyId, patch) {
    if (!selectedDeal) return;
    updateDeal(selectedDeal.id, { [type]: selectedDeal[type].map((p) => (p.id === partyId ? { ...p, ...patch } : p)) });
  }

  function toggleDoc(type, partyId, docName, value) {
    if (!selectedDeal) return;
    updateDeal(selectedDeal.id, {
      [type]: selectedDeal[type].map((p) => (p.id === partyId ? { ...p, docs: { ...p.docs, [docName]: value } } : p)),
    });
  }

  function toggleSection(key) {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const globalStats = useMemo(() => {
    const totalDeals = tranzactii.length;
    const programmed = tranzactii.filter((d) => d.status === "programat").length;
    const missingDocsCount = tranzactii.filter((d) => getDealWarnings(d).length > 0).length;
    const done = tranzactii.filter((d) => d.status === "tranzactionat").length;
    return { totalDeals, programmed, missingDocsCount, done };
  }, [tranzactii]);

  const sellerCommission = selectedDeal ? calculateCommission(selectedDeal.price, selectedDeal.area, selectedDeal.sellerCommissionType, selectedDeal.sellerCommissionValue) : 0;
  const buyerCommission = selectedDeal ? calculateCommission(selectedDeal.price, selectedDeal.area, selectedDeal.buyerCommissionType, selectedDeal.buyerCommissionValue) : 0;
  const warnings = selectedDeal ? getDealWarnings(selectedDeal) : [];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 14, fontFamily: "Arial, sans-serif", color: "#111827", boxSizing: "border-box" }}>
      <div style={{ maxWidth: LAYOUT.pageMaxWidth, margin: "0 auto", display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, color: "#0075fc" }}>Manager local programari notar</h1>
            <p style={{ marginTop: 8, color: "#6b7280" }}>Imobiliare Jucu</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={buttonStyle(false)} onClick={duplicateDeal}>Duplica tranzactie</button>
            <button style={buttonStyle(false)} onClick={clearAllData}>Reset demo</button>
            <button style={buttonStyle(true)} onClick={addDeal}>Tranzactie noua</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          <div style={sectionStyle()}><div style={{ color: "#6b7280", fontSize: 13 }}>Total tranzactii</div><div style={{ fontSize: 28, fontWeight: 700 }}>{globalStats.totalDeals}</div></div>
          <div style={sectionStyle()}><div style={{ color: "#6b7280", fontSize: 13 }}>Programate</div><div style={{ fontSize: 28, fontWeight: 700 }}>{globalStats.programmed}</div></div>
          <div style={sectionStyle()}><div style={{ color: "#6b7280", fontSize: 13 }}>Cu warning-uri</div><div style={{ fontSize: 28, fontWeight: 700 }}>{globalStats.missingDocsCount}</div></div>
          <div style={sectionStyle()}><div style={{ color: "#6b7280", fontSize: 13 }}>Ultima salvare</div><div style={{ fontSize: 16, fontWeight: 700 }}>{savedAt || "-"}</div></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `${LAYOUT.leftCol}px minmax(0, 1fr)`, gap: 14, alignItems: "start" }}>
          <div style={{ ...sectionStyle(), display: "flex", flexDirection: "column" }}>
            <h3 style={{ marginTop: 0 }}>Tranzactii</h3>
            <div style={{ display: "grid", gap: 10 }}>
              <input style={inputStyle()} placeholder="Cauta..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select style={inputStyle()} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="toate">Toate statusurile</option>
                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <select style={inputStyle()} value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
                <option value="toate">Toti agentii</option>
                {AGENT_OPTIONS.map((agent) => <option key={agent} value={agent}>{agent}</option>)}
              </select>
              <select style={inputStyle()} value={commissionFilter} onChange={(e) => setCommissionFilter(e.target.value)}>
                <option value="toate">Toate comisioanele</option>
                <option value="probleme comision">Comision neachitat + achitat partial</option>
                <option value="neachitat">Comision neachitat</option>
                <option value="achitat partial">Comision achitat partial</option>
                <option value="achitat">Comision achitat</option>
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", marginTop: 2 }}>
                <input type="checkbox" checked={hidePaidCommissions} onChange={(e) => setHidePaidCommissions(e.target.checked)} />
                <span>Ascunde tranzactiile cu comision achitat</span>
              </label>
              <select style={inputStyle()} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="manual">Ordinea din lista</option>
                <option value="cronologic_asc">Cronologic - cel mai apropiat</option>
                <option value="cronologic_desc">Cronologic - cel mai indepartat</option>
                <option value="status">Dupa status</option>
              </select>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 12, maxHeight: "74vh", overflowY: "auto", paddingRight: 4 }}>
              {filteredDeals.map((deal) => {
                const dealWarnings = getDealWarnings(deal);
                const commissionWarnings = getCommissionWarnings(deal);
                const sellerCommissionValue = calculateCommission(deal.price, deal.area, deal.sellerCommissionType, deal.sellerCommissionValue);
                const buyerCommissionValue = calculateCommission(deal.price, deal.area, deal.buyerCommissionType, deal.buyerCommissionValue);
                const sellerNames = deal.sellers.map((s) => s.name || "Fara nume").join(", ");
                const buyerNames = deal.buyers.map((b) => b.name || "Fara nume").join(", ");
                return (
                  <div key={deal.id} onClick={() => setSelectedId(deal.id)} style={{ border: selectedId === deal.id ? "2px solid #111827" : "1px solid #d1d5db", borderRadius: 14, padding: 10, background: "white", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}>
                      <div style={{ fontWeight: 700, flex: 1 }}>{deal.title || "Tranzactie fara nume"}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                        <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, ...STATUS_COLORS[deal.status] }}>{deal.status}</span>
                        <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, ...TYPE_COLORS[deal.type] }}>{deal.type}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#4b5563", display: "grid", gap: 3, lineHeight: 1.3 }}>
                      <div><b>Agent:</b> {deal.agent || "-"}</div>
                      <div><b>Vanzatori:</b> {sellerNames || "-"}</div>
                      <div><b>Cumparatori:</b> {buyerNames || "-"}</div>
                      <div><b>Pret:</b> {deal.price ? `${formatNumber(deal.price)} EUR` : "-"} · <b>Moneda plata:</b> {deal.priceCurrency}</div>
                      <div><b>Com. V:</b> {formatMoney(sellerCommissionValue, "EUR")} · <b>Com. C:</b> {formatMoney(buyerCommissionValue, "EUR")}</div>
                      <div><b>Avans:</b> {formatDateTime(deal.advanceDateTime)}</div>
                      <div><b>Final:</b> {formatDateTime(deal.finalDateTime)}</div>
                      {deal.type === "avans" && parseNumber(deal.advanceAmount) > 0 ? (
                        <div>
                          <b>Suma avans:</b> {formatMoney(deal.advanceAmount, "EUR")}
                          {deal.advanceCurrency && deal.advanceCurrency !== "EUR" ? ` (${deal.advanceCurrency})` : ""}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ marginTop: 8, display: "grid", gap: 4, fontSize: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Completare acte: {dealCompletion(deal)}%</span>
                        <span>{dealWarnings.length ? `${dealWarnings.length} warning` : "OK"}</span>
                      </div>
                      {commissionWarnings.map((warning, idx) => (
                        <div key={idx} style={{ color: "#b91c1c", fontWeight: 800, fontSize: 11, lineHeight: 1.2 }}>{warning}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            {selectedDeal ? (
              <>
                <Section title="Detalii tranzactie" isOpen={sectionsOpen.detalii} onToggle={() => toggleSection("detalii")}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle()}>Nume tranzactie</label>
                      <input style={inputStyle()} value={selectedDeal.title || ""} onChange={(e) => updateDeal(selectedDeal.id, { title: e.target.value })} placeholder="Ex: Jucu - teren 1500 mp" />
                    </div>

                    <div>
                      <label style={labelStyle()}>Status</label>
                      <select style={inputStyle()} value={selectedDeal.status} onChange={(e) => updateDeal(selectedDeal.id, { status: e.target.value })}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle()}>Agent</label>
                      <select style={inputStyle()} value={selectedDeal.agent || "Paul Pojar"} onChange={(e) => updateDeal(selectedDeal.id, { agent: e.target.value })}>
                        {AGENT_OPTIONS.map((agent) => <option key={agent} value={agent}>{agent}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle()}>Tip</label>
                      <select style={inputStyle()} value={selectedDeal.type} onChange={(e) => updateDeal(selectedDeal.id, { type: e.target.value })}>
                        {TYPE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle()}>Suprafata</label>
                      <input style={inputStyle()} type="number" step="0.01" value={selectedDeal.area} onChange={(e) => updateDeal(selectedDeal.id, { area: e.target.value })} placeholder="mp" />
                    </div>

                    <div>
                      <label style={labelStyle()}>Pret (EUR)</label>
                      <input style={inputStyle()} type="number" step="0.01" value={selectedDeal.price} onChange={(e) => updateDeal(selectedDeal.id, { price: e.target.value })} placeholder="Ex: 120000" />
                      {selectedDeal.price ? <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{formatNumber(selectedDeal.price)} EUR</div> : null}
                    </div>

                    <div>
                      <label style={labelStyle()}>Moneda plata pret</label>
                      <select style={inputStyle()} value={selectedDeal.priceCurrency} onChange={(e) => updateDeal(selectedDeal.id, { priceCurrency: e.target.value })}>
                        {CURRENCY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle()}>Data si ora final</label>
                      <input style={inputStyle()} type="datetime-local" value={selectedDeal.finalDateTime} onChange={(e) => updateDeal(selectedDeal.id, { finalDateTime: e.target.value })} />
                    </div>

                    {selectedDeal.type === "avans" && (
                      <>
                        <div>
                          <label style={labelStyle()}>Data si ora avans</label>
                          <input style={inputStyle()} type="datetime-local" value={selectedDeal.advanceDateTime} onChange={(e) => updateDeal(selectedDeal.id, { advanceDateTime: e.target.value })} />
                        </div>

                        <div>
                          <label style={labelStyle()}>Avans (EUR)</label>
                          <input style={inputStyle()} type="number" step="0.01" value={selectedDeal.advanceAmount} onChange={(e) => updateDeal(selectedDeal.id, { advanceAmount: e.target.value })} placeholder="Suma avans in EUR" />
                          {selectedDeal.advanceAmount ? <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{formatNumber(selectedDeal.advanceAmount)} EUR</div> : null}
                        </div>

                        <div>
                          <label style={labelStyle()}>Moneda plata avans</label>
                          <select style={inputStyle()} value={selectedDeal.advanceCurrency} onChange={(e) => updateDeal(selectedDeal.id, { advanceCurrency: e.target.value })}>
                            {CURRENCY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </>
                    )}

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle()}>Observatii generale tranzactie</label>
                      <textarea style={{ ...inputStyle(), minHeight: 90 }} value={selectedDeal.notes} onChange={(e) => updateDeal(selectedDeal.id, { notes: e.target.value })} />
                    </div>
                  </div>
                </Section>

                <Section title="Comision" isOpen={sectionsOpen.comision} onToggle={() => toggleSection("comision")}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                    <div>
                      <label style={labelStyle()}>Tip comision vanzator</label>
                      <select style={inputStyle()} value={selectedDeal.sellerCommissionType} onChange={(e) => updateDeal(selectedDeal.id, { sellerCommissionType: e.target.value })}>
                        {COMMISSION_TYPE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle()}>VAL comision vanzator</label>
                      <input style={inputStyle()} type="number" step="0.01" value={selectedDeal.sellerCommissionValue} onChange={(e) => updateDeal(selectedDeal.id, { sellerCommissionValue: e.target.value })} />
                    </div>
                    <div>
                      <label style={labelStyle()}>Comision vanzator (EUR)</label>
                      <input style={inputStyle()} value={formatMoney(sellerCommission, "EUR")} readOnly />
                    </div>
                    <div>
                      <label style={labelStyle()}>Status comision vanzator</label>
                      <select style={inputStyle()} value={selectedDeal.sellerCommissionPaymentStatus} onChange={(e) => updateDeal(selectedDeal.id, { sellerCommissionPaymentStatus: e.target.value, sellerCommissionPaidAmount: e.target.value === "Achitat partial" ? selectedDeal.sellerCommissionPaidAmount : "" })}>
                        {COMMISSION_PAYMENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {selectedDeal.sellerCommissionPaymentStatus === "Achitat partial" ? (
                      <div>
                        <label style={labelStyle()}>Suma achitata comision vanzator</label>
                        <input style={inputStyle()} type="number" step="0.01" value={selectedDeal.sellerCommissionPaidAmount} onChange={(e) => updateDeal(selectedDeal.id, { sellerCommissionPaidAmount: e.target.value })} />
                      </div>
                    ) : null}
                    <div>
                      <label style={labelStyle()}>Tip comision cumparator</label>
                      <select style={inputStyle()} value={selectedDeal.buyerCommissionType} onChange={(e) => updateDeal(selectedDeal.id, { buyerCommissionType: e.target.value })}>
                        {COMMISSION_TYPE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle()}>VAL comision cumparator</label>
                      <input style={inputStyle()} type="number" step="0.01" value={selectedDeal.buyerCommissionValue} onChange={(e) => updateDeal(selectedDeal.id, { buyerCommissionValue: e.target.value })} />
                    </div>
                    <div>
                      <label style={labelStyle()}>Comision cumparator (EUR)</label>
                      <input style={inputStyle()} value={formatMoney(buyerCommission, "EUR")} readOnly />
                    </div>
                    <div>
                      <label style={labelStyle()}>Status comision cumparator</label>
                      <select style={inputStyle()} value={selectedDeal.buyerCommissionPaymentStatus} onChange={(e) => updateDeal(selectedDeal.id, { buyerCommissionPaymentStatus: e.target.value, buyerCommissionPaidAmount: e.target.value === "Achitat partial" ? selectedDeal.buyerCommissionPaidAmount : "" })}>
                        {COMMISSION_PAYMENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {selectedDeal.buyerCommissionPaymentStatus === "Achitat partial" ? (
                      <div>
                        <label style={labelStyle()}>Suma achitata comision cumparator</label>
                        <input style={inputStyle()} type="number" step="0.01" value={selectedDeal.buyerCommissionPaidAmount} onChange={(e) => updateDeal(selectedDeal.id, { buyerCommissionPaidAmount: e.target.value })} />
                      </div>
                    ) : null}
                  </div>
                </Section>

                <Section title="Warning-uri tranzactie" isOpen={sectionsOpen.warninguri} onToggle={() => toggleSection("warninguri")} bg="#fefce8">
                  {warnings.length ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      {warnings.map((warning, idx) => <div key={idx} style={{ border: "1px solid #fde68a", background: "white", borderRadius: 10, padding: "8px 10px", fontSize: 12, lineHeight: 1.25 }}>{warning}</div>)}
                    </div>
                  ) : (
                    <div style={{ border: "1px solid #86efac", background: "white", borderRadius: 10, padding: "8px 10px", color: "#15803d", fontSize: 12 }}>Tranzactia arata bine. Nu exista warning-uri active.</div>
                  )}
                </Section>

                <Section title="Vanzatori" isOpen={sectionsOpen.vanzatori} onToggle={() => toggleSection("vanzatori")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ color: "#6b7280" }}>Vanzatori: {selectedDeal.sellers.length}</div>
                    <button style={buttonStyle(false)} onClick={() => addParty("sellers")}>Adauga vanzator</button>
                  </div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {selectedDeal.sellers.map((party, idx) => {
                      const checkedCount = DOC_OPTIONS.filter((d) => party.docs[d]).length;
                      const missing = missingDocs(party);
                      return (
                        <div key={party.id} style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 14 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
                            <div style={{ display: "grid", gap: 10 }}>
                              <div>
                                <label style={labelStyle()}>{party.name?.trim() || `Vanzator ${idx + 1}`}</label>
                                <input style={inputStyle()} value={party.name} onChange={(e) => updateParty("sellers", party.id, { name: e.target.value })} placeholder={`Vanzator ${idx + 1}`} />
                              </div>
                              <div>
                                <label style={labelStyle()}>Observatii</label>
                                <textarea style={{ ...inputStyle(), minHeight: 80 }} value={party.notes || ""} onChange={(e) => updateParty("sellers", party.id, { notes: e.target.value })} />
                              </div>
                            </div>
                            <button style={buttonStyle(false)} onClick={() => removeParty("sellers", party.id)}>Sterge</button>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 13 }}>
                            <span>Documente primite: {checkedCount}/{DOC_OPTIONS.length}</span>
                            <span>{missing.length ? `Lipsesc ${missing.length}` : "Complet"}</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
                            {DOC_OPTIONS.map((doc) => (
                              <label key={doc} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                                <input type="checkbox" checked={party.docs[doc]} onChange={(e) => toggleDoc("sellers", party.id, doc, e.target.checked)} />
                                <span>{doc}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>

                <Section title="Cumparatori" isOpen={sectionsOpen.cumparatori} onToggle={() => toggleSection("cumparatori")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ color: "#6b7280" }}>Cumparatori: {selectedDeal.buyers.length}</div>
                    <button style={buttonStyle(false)} onClick={() => addParty("buyers")}>Adauga cumparator</button>
                  </div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {selectedDeal.buyers.map((party, idx) => {
                      const checkedCount = DOC_OPTIONS.filter((d) => party.docs[d]).length;
                      const missing = missingDocs(party);
                      return (
                        <div key={party.id} style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 14 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
                            <div style={{ display: "grid", gap: 10 }}>
                              <div>
                                <label style={labelStyle()}>{party.name?.trim() || `Cumparator ${idx + 1}`}</label>
                                <input style={inputStyle()} value={party.name} onChange={(e) => updateParty("buyers", party.id, { name: e.target.value })} placeholder={`Cumparator ${idx + 1}`} />
                              </div>
                              <div>
                                <label style={labelStyle()}>Observatii</label>
                                <textarea style={{ ...inputStyle(), minHeight: 80 }} value={party.notes || ""} onChange={(e) => updateParty("buyers", party.id, { notes: e.target.value })} />
                              </div>
                            </div>
                            <button style={buttonStyle(false)} onClick={() => removeParty("buyers", party.id)}>Sterge</button>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 13 }}>
                            <span>Documente primite: {checkedCount}/{DOC_OPTIONS.length}</span>
                            <span>{missing.length ? `Lipsesc ${missing.length}` : "Complet"}</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
                            {DOC_OPTIONS.map((doc) => (
                              <label key={doc} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                                <input type="checkbox" checked={party.docs[doc]} onChange={(e) => toggleDoc("buyers", party.id, doc, e.target.checked)} />
                                <span>{doc}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>

                <div>
                  <button style={{ ...buttonStyle(false), color: "#b91c1c", borderColor: "#fca5a5" }} onClick={() => deleteDeal(selectedDeal.id)}>Sterge tranzactia</button>
                </div>
              </>
            ) : (
              <div style={sectionStyle()}>Nu exista tranzactii. Apasa pe "Tranzactie noua".</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
