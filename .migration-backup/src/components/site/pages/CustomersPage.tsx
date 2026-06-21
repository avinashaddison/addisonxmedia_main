/**
 * Customers — derived from the orders table (no separate customers table).
 *
 * Each row aggregates a unique customer by phone:
 *   - total orders, total spent, last/first order dates
 *   - WhatsApp button for one-click outreach
 *
 * When we add loyalty / segments / customer notes, this graduates to a real
 * `customer` table backed by a materialized view of orders.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Loader2, Phone, MessageSquare, Trophy, TrendingUp, Inbox, Search,
} from "lucide-react";
import { api, type CustomerDto } from "@/lib/api";
import { formatRelative } from "@/lib/inbox-types";
import { cn } from "@/lib/utils";

export const CustomersPage = () => {
  const [search, setSearch] = useState("");
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.getCustomers(),
    refetchInterval: 30_000,
  });

  // Aggregate stats for the header strip
  const stats = useMemo(() => {
    const total = customers.length;
    const repeatCount = customers.filter((c) => Number(c.order_count) >= 2).length;
    const grossRevenue = customers.reduce((s, c) => s + (Number(c.total_spent_inr) || 0), 0);
    const avgOrderValue = customers.length > 0
      ? grossRevenue / customers.reduce((s, c) => s + Number(c.order_count), 0)
      : 0;
    return { total, repeatCount, grossRevenue, avgOrderValue };
  }, [customers]);

  // Filter by search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      c.customer_name.toLowerCase().includes(q) ||
      (c.customer_phone || "").includes(q) ||
      (c.customer_email || "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#3C50E0]">
            <Users className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">Customers</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">
              People who have placed at least one order — sorted by most recent.
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Customers" value={String(stats.total)} accent="#3C50E0" />
          <Stat label="Repeat (2+)" value={String(stats.repeatCount)} accent="#0E8A4B" />
          <Stat
            label="Gross revenue"
            value={`₹${Math.round(stats.grossRevenue).toLocaleString("en-IN")}`}
            accent="#FF6A1F"
          />
          <Stat
            label="Avg order"
            value={`₹${Math.round(stats.avgOrderValue).toLocaleString("en-IN")}`}
            accent="#D4308E"
          />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or email…"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-medium"
          />
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center px-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#E4E8FF] flex items-center justify-center mb-3">
                <Inbox className="w-7 h-7 text-[#3C50E0]" />
              </div>
              <h3 className="text-[15px] font-extrabold mb-1">
                {customers.length === 0 ? "No customers yet" : "No matches"}
              </h3>
              <p className="text-[12.5px] text-foreground/60 max-w-md mx-auto leading-relaxed">
                {customers.length === 0
                  ? "Once a customer places their first order, they'll appear here with their order history."
                  : "Try a different search."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-foreground/10">
              {filtered.map((c) => <CustomerRow key={(c.customer_phone || c.customer_name) + c.first_order_at} customer={c} />)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const CustomerRow = ({ customer }: { customer: CustomerDto }) => {
  const orderCount = Number(customer.order_count);
  const spent = Number(customer.total_spent_inr);
  const isVip = orderCount >= 5 || spent >= 5000;
  const isRepeat = orderCount >= 2;

  const waLink = (() => {
    if (!customer.customer_phone) return null;
    const phone = customer.customer_phone.replace(/\D+/g, "");
    if (!phone) return null;
    return `https://wa.me/${phone}`;
  })();

  return (
    <li className="px-4 sm:px-5 py-4 hover:bg-[#FFF6E8]/50 transition flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[13px] font-extrabold flex-shrink-0 bg-gradient-to-br from-[#3C50E0] to-[#2533A8]">
        {customer.customer_name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-[14px] font-extrabold truncate">{customer.customer_name}</h4>
          {isVip && (
            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFD23F] text-[#7A4A00]">
              <Trophy className="w-2.5 h-2.5" /> VIP
            </span>
          )}
          {!isVip && isRepeat && (
            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#E6F7EE] text-[#0E8A4B]">
              <TrendingUp className="w-2.5 h-2.5" /> Repeat
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap mt-0.5">
          {customer.customer_phone && (
            <span className="text-[11.5px] font-mono font-bold text-foreground/65">{customer.customer_phone}</span>
          )}
          <span className="text-[11px] text-foreground/55">
            {orderCount} order{orderCount === 1 ? "" : "s"} · last {formatRelative(customer.last_order_at)}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <p className="text-[13px] font-black tabular-nums text-[#0E8A4B]">
          ₹{spent.toLocaleString("en-IN")}
        </p>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-[#0E8A4B] text-white text-[10px] font-extrabold hover:bg-[#0A6E3C] transition"
            title="Message on WhatsApp"
          >
            <MessageSquare className="w-3 h-3" /> WhatsApp
          </a>
        )}
      </div>
    </li>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <div className="p-4 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968]">
    <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: accent }}>{label}</p>
    <p className="text-[20px] font-black mt-1 leading-none tabular-nums">{value}</p>
  </div>
);
