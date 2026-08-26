"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { formatMoney, formatMonth } from "@/lib/format";
import type { MonthlyBucketSpending, NetWorthPoint, SavingsRatePoint } from "@/lib/analytics";

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${formatMonth(month)} ${String(year).slice(2)}`;
}

export function SpendingTrendChart({
  rows,
  bucketNames,
  colors,
}: {
  rows: MonthlyBucketSpending[];
  bucketNames: string[];
  colors: Record<string, string>;
}) {
  const data = rows.map((r) => ({ ...r, monthLabel: monthLabel(r.month) }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="monthLabel" fontSize={12} />
        <YAxis fontSize={12} tickFormatter={(v) => formatMoney(v)} width={80} />
        <Tooltip formatter={(value) => (typeof value === "number" ? formatMoney(value) : value)} />
        <Legend />
        {bucketNames.map((name) => (
          <Bar key={name} dataKey={name} stackId="spend" fill={colors[name] ?? "var(--color-neutral)"} radius={[0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NetWorthChart({
  rows,
  accountNames,
  colors,
}: {
  rows: NetWorthPoint[];
  accountNames: string[];
  colors: Record<string, string>;
}) {
  const data = rows.map((r) => ({ ...r, monthLabel: monthLabel(r.month) }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="monthLabel" fontSize={12} />
        <YAxis fontSize={12} tickFormatter={(v) => formatMoney(v)} width={80} />
        <Tooltip formatter={(value) => (typeof value === "number" ? formatMoney(value) : value)} />
        <Legend />
        {accountNames.map((name) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={colors[name] ?? "var(--color-neutral)"}
            strokeWidth={2}
            dot={false}
          />
        ))}
        <Line
          type="monotone"
          dataKey="total"
          stroke="var(--color-base-content)"
          strokeWidth={3}
          strokeDasharray="4 2"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SavingsRateChart({ rows }: { rows: SavingsRatePoint[] }) {
  const data = rows.map((r) => ({ ...r, monthLabel: monthLabel(r.month), ratePct: r.rate * 100 }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="monthLabel" fontSize={12} />
        <YAxis fontSize={12} tickFormatter={(v) => `${v}%`} width={50} />
        <ReferenceLine y={0} stroke="var(--color-base-content)" strokeOpacity={0.3} />
        <Tooltip
          formatter={(value, name, item) => {
            if (name === "ratePct") return [`${Number(value).toFixed(1)}%`, "Savings rate"];
            return [formatMoney(Number(value)), name];
          }}
          labelFormatter={(label, payload) => {
            const point = payload?.[0]?.payload as (typeof data)[number] | undefined;
            if (!point) return label;
            return `${label} — income ${formatMoney(point.income)}, saved ${formatMoney(point.saved)}`;
          }}
        />
        <Bar dataKey="ratePct" radius={[4, 4, 0, 0]}>
          {data.map((point) => (
            <Cell
              key={point.month}
              fill={point.ratePct >= 0 ? "var(--color-success)" : "var(--color-error)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
