"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalesByHourPoint } from "@/lib/reporting";

type Props = {
  data: SalesByHourPoint[];
  emptyLabel?: string;
};

const toNumber = (v: string | number | null | undefined) => {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const SalesByHourChart = ({ data, emptyLabel = "No sales in this period." }: Props) => {
  if (!data.length) {
    return <p className="py-10 text-center text-sm text-text-muted">{emptyLabel}</p>;
  }

  const chartData = data
    .slice()
    .sort((a, b) => a.hour - b.hour)
    .map((p) => ({
      hour: p.label ?? `${String(p.hour).padStart(2, "0")}:00`,
      sales: toNumber(p.sales ?? p.amount),
      avg: toNumber(p.avgSameWeekday),
    }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: 12,
            }}
          />
          <Bar dataKey="sales" name="Sales" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
