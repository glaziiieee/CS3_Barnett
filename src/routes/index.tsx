import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  AiOutlineGlobal,
  AiOutlineLineChart,
  AiOutlineStar,
} from "react-icons/ai";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ResponsiveRadar } from "@nivo/radar";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useYearFilter } from "../hooks/useYearFilter";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

function DashboardBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  const value = typeof p.value === "number" ? p.value : Number(p.value);
  const formatted = Number.isFinite(value) ? value.toLocaleString() : "N/A";
  const title = label == null || label === "" ? "Year" : String(label);

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg"
      style={{
        color: "#000",
        WebkitTextFillColor: "#000",
        WebkitTextStroke: "0px",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        className="text-sm font-bold mb-2"
        style={{ color: "#000", WebkitTextFillColor: "#000", WebkitTextStroke: "0px" }}
      >
        {title}
      </div>
      <div className="flex items-center gap-3">
        <span
          className="inline-block h-3 w-3 rounded-sm"
          style={{ background: p.color || "#E5748F" }}
        />
        <span
          className="text-sm"
          style={{ color: "#000", WebkitTextFillColor: "#000", WebkitTextStroke: "0px" }}
        >
          <span
            className="font-semibold"
            style={{ color: "#000", WebkitTextFillColor: "#000", WebkitTextStroke: "0px" }}
          >
            Population
          </span>
          <span
            className="ml-2 font-semibold"
            style={{ color: "#000", WebkitTextFillColor: "#000", WebkitTextStroke: "0px" }}
          >
            {formatted}
          </span>
        </span>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { selectedYear } = useYearFilter("all");
  const stats = useDashboardStats(selectedYear);
  const [yearlyData, setYearlyData] = useState<Array<{ year: number; total: number }>>([]);
  const [radarData, setRadarData] = useState<Array<{ category: string; [key: string]: string | number }>>([]);

  // Fetch yearly totals for bar chart
  useEffect(() => {
    const fetchYearlyData = async () => {
      try {
        const destinationQuery = query(
          collection(db, "emigrantData_destination"),
          orderBy("Year")
        );
        const snapshot = await getDocs(destinationQuery);
        
        const yearTotals = new Map<number, number>();
        
        snapshot.docs.forEach((doc) => {
          const docData = doc.data();
          const year = docData.Year;
          let yearTotal = 0;
          
          Object.entries(docData).forEach(([key, value]) => {
            if (key === "Year") return;
            const emigrants =
              typeof value === "object" && value !== null && "emigrants" in value
                ? (value as { emigrants: number }).emigrants
                : null;
            if (emigrants && typeof emigrants === "number") {
              yearTotal += emigrants;
            }
          });
          
          if (yearTotal > 0) {
            yearTotals.set(year, yearTotal);
          }
        });
        
        const allYears = Array.from(yearTotals.entries())
          .sort(([a], [b]) => a - b)
          .map(([year, total]) => ({ year, total }));

        const filteredYears =
          selectedYear === "all"
            ? allYears
            : allYears.filter((p) => p.year === selectedYear);

        setYearlyData(filteredYears);

        const radarYear =
          selectedYear === "all" ? allYears[allYears.length - 1]?.year : selectedYear;
        if (radarYear != null) {
          const countryTotals: Record<string, number> = {};

          snapshot.docs.forEach((doc) => {
            const docData = doc.data() as Record<string, unknown>;
            const year = (docData as any).Year;
            if (year !== radarYear) return;

            Object.entries(docData).forEach(([key, value]) => {
              if (key === "Year") return;
              const emigrants =
                typeof value === "object" &&
                value !== null &&
                "emigrants" in value
                  ? (value as { emigrants: number }).emigrants
                  : null;
              if (emigrants && typeof emigrants === "number" && emigrants > 0) {
                countryTotals[key] = (countryTotals[key] || 0) + emigrants;
              }
            });
          });

          const topCountries = Object.entries(countryTotals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

          const radarRows = topCountries.map(([country, total]) => ({
            category: country,
            Population: total,
          }));

          setRadarData(radarRows);
        } else {
          setRadarData([]);
        }
      } catch (error) {
        console.error("Error fetching yearly data:", error);
      }
    };
    
    fetchYearlyData();
  }, [selectedYear]);

  const barChartData = useMemo(() => {
    const data = selectedYear === "all" ? yearlyData.slice(-9) : yearlyData;
    return data.map((item) => ({
      year: item.year,
      population: item.total,
    }));
  }, [yearlyData, selectedYear]);

  // Calculate metrics
  const recentYearTotal = useMemo(() => {
    return yearlyData[yearlyData.length - 1]?.total || 0;
  }, [yearlyData]);

  const previousYearTotal = useMemo(() => {
    return yearlyData[yearlyData.length - 2]?.total || 0;
  }, [yearlyData]);

  const growthRate = useMemo(() => {
    if (previousYearTotal === 0) return 0;
    return ((recentYearTotal - previousYearTotal) / previousYearTotal) * 100;
  }, [recentYearTotal, previousYearTotal]);

  if (stats.isLoading) {
    return (
      <div className="p-6 bg-white min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading dashboard data...</div>
      </div>
    );
  }

  if (stats.error) {
    return (
      <div className="p-6 bg-white min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error loading dashboard: {stats.error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Top Row: Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Total Emigrants Card - Pastel Blue */}
          <div className="bg-blue-200 rounded-lg p-6 text-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Total Population</h3>
              <div className="bg-blue-100 rounded-full p-2">
                <AiOutlineGlobal className="text-xl text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{stats.totalPopulation}M</p>
          </div>

          {/* Total Countries Card - White */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">Countries</h3>
              <div className="bg-orange-100 rounded-full p-2">
                <AiOutlineGlobal className="text-xl text-orange-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalCountries}</p>
          </div>

          {/* Data Years Card - White */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">Data Range</h3>
              <div className="bg-orange-100 rounded-full p-2">
                <AiOutlineLineChart className="text-xl text-orange-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.dataYears}</p>
          </div>

          {/* Growth Rate Card - White */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">Growth Rate</h3>
              <div className="bg-orange-100 rounded-full p-2">
                <AiOutlineStar className="text-xl text-orange-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {growthRate > 0 ? "+" : ""}{growthRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Middle Row: Bar Chart and Donut Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Bar Chart - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Yearly Population Trends</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData.length > 0 ? barChartData : []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="year" stroke="#6b7280" />
                <YAxis stroke="#6b7280" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                <Tooltip content={<DashboardBarTooltip />} wrapperStyle={{ outline: "none" }} />
                <Bar dataKey="population" fill="#E5748F" name="Population" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Donut Chart - Takes 1 column */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Destinations</h3>
            <div style={{ height: 300 }}>
              {radarData.length > 0 ? (
                <ResponsiveRadar
                  data={radarData}
                  keys={["Population"]}
                  indexBy="category"
                  valueFormat=">-.0f"
                  margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
                  borderColor={{ from: "color" }}
                  gridLabelOffset={24}
                  dotSize={8}
                  dotColor={{ theme: "background" }}
                  dotBorderWidth={2}
                  colors={{ scheme: "nivo" }}
                  blendMode="multiply"
                  motionConfig="wobbly"
                  theme={{
                    axis: {
                      domain: { line: { stroke: "#e5e7eb", strokeWidth: 1 } },
                      ticks: {
                        line: { stroke: "#e5e7eb", strokeWidth: 1 },
                        text: { fill: "#6b7280", fontSize: 11 },
                      },
                      legend: { text: { fill: "#374151", fontSize: 12 } },
                    },
                    grid: {
                      line: { stroke: "#e5e7eb", strokeWidth: 1 },
                    },
                    legends: {
                      text: { fill: "#374151" },
                    },
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
