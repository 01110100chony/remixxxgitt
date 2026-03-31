import { useMemo } from "react";
import { Article } from "@/lib/lattes-parser";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { BarChart3 } from "lucide-react";

interface ResearcherChartProps {
  articles: Article[];
  researchers: string[];
}

const COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--primary))",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

const ResearcherChart = ({ articles, researchers }: ResearcherChartProps) => {
  const data = useMemo(() => {
    // Build year → { year, researcher1: count, researcher2: count, ... }
    const yearMap: Record<string, Record<string, number>> = {};
    articles.forEach((a) => {
      if (a.year === "—") return;
      if (!yearMap[a.year]) yearMap[a.year] = {};
      yearMap[a.year][a.researcher] = (yearMap[a.year][a.researcher] || 0) + 1;
    });

    return Object.entries(yearMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, counts]) => ({ year, ...counts }));
  }, [articles]);

  if (researchers.length < 2 || data.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <BarChart3 className="h-4 w-4 text-accent" />
        Comparativo entre docentes por ano
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="year"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "13px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }}
            />
            {researchers.map((name, i) => (
              <Bar
                key={name}
                dataKey={name}
                fill={COLORS[i % COLORS.length]}
                radius={[3, 3, 0, 0]}
                stackId="stack"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ResearcherChart;
