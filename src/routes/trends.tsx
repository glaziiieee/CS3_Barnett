import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
  ResponsiveContainer,
} from "recharts";
import { useTrendData } from "../hooks/useTrendData";

interface OHLCData {
  year: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

// Custom Candlestick Shape Component for Recharts
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;

  if (!payload || typeof payload.open !== "number") {
    return null;
  }

  const { open, close, high, low } = payload;

  // Ensure all values are valid
  if (high === undefined || low === undefined || high < low) {
    return null;
  }

  const isGreen = close >= open;
  const color = isGreen ? "#22c55e" : "#ef4444";

  // Calculate positions relative to the bar's position
  const centerX = x + width / 2;

  // Calculate the range of values
  const range = high - low;
  if (range === 0) return null; // Skip if no range

  const heightScale = height / range;

  // Raw Y positions (before clamping)
  let highY = y;
  let lowY = y + height;
  let openY = y + (high - open) * heightScale;
  let closeY = y + (high - close) * heightScale;

  // Prevent drawing elements beyond the plotting area (so they don't overlap the x-axis)
  const padding = 2; // pixels of padding from chart edges
  const minY = y + padding;
  const maxY = y + height - padding;

  const clamp = (val: number) => Math.max(minY, Math.min(maxY, val));

  highY = clamp(highY);
  lowY = clamp(lowY);
  openY = clamp(openY);
  closeY = clamp(closeY);

  const bodyTop = Math.min(openY, closeY);
  let bodyHeight = Math.abs(openY - closeY);
  // Ensure minimum visible body height
  if (bodyHeight < 2) bodyHeight = 2;

  // If the body would spill past the bottom, shrink it to stay inside
  if (bodyTop + bodyHeight > maxY) {
    bodyHeight = Math.max(2, maxY - bodyTop);
  }

  // Make the body width 50% of the available width to prevent overlap
  const bodyWidth = width * 0.5;

  return (
    <g>
      {/* Wick line - from high to low (clamped) */}
      <line
        x1={centerX}
        y1={highY}
        x2={centerX}
        y2={lowY}
        stroke={color}
        strokeWidth={1.5}
      />

      {/* Body - from open to close (clamped, with minimum height) */}
      <rect
        x={centerX - bodyWidth / 2}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        fill={color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

export const Route = createFileRoute("/trends")({
  component: TrendAnalysis,
});

// Transform age group trend data to OHLC format
function transformToOHLC(
  ageGroupTrends: any[],
  selectedAgeGroup: string
): OHLCData[] {
  const selectedData = ageGroupTrends.find(
    (trend) => trend.id === selectedAgeGroup
  );

  if (!selectedData) return [];

  return selectedData.data.map((point: any, index: number, arr: any[]) => {
    const value = point.y;
    const prevValue = index > 0 ? arr[index - 1].y : value;
    const volatility = Math.abs(value) * 0.08; // 8% volatility, use absolute value

    // Ensure all values are positive and low is never below a reasonable minimum
    const high = value + volatility;
    const low = Math.max(value * 0.1, value - volatility); // Ensure low is at least 10% of value

    return {
      year: point.x,
      open: prevValue,
      high: high,
      low: low,
      close: value,
    };
  });
}

function TrendAnalysis() {
  const [selectedCountry, setSelectedCountry] = useState<string>("USA");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>("");

  const {
    countryTrends,
    ageGroupTrends,
    loading,
    error,
    countries,
    ageGroups,
  } = useTrendData(selectedCountry);

  // Set default age group when data loads
  if (!selectedAgeGroup && ageGroups.length > 0) {
    setSelectedAgeGroup(ageGroups[0]);
  }

  const candlestickData = transformToOHLC(ageGroupTrends, selectedAgeGroup);

  if (loading) {
    return (
      <div className="p-6 bg-primary min-h-screen flex items-center justify-center">
        <div className="text-gray-300">Loading trend data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-primary min-h-screen flex items-center justify-center">
        <div className="text-red-400">Error loading data: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-primary min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Trend Analysis</h1>
          <p className="text-gray-300 text-lg">
            Analyze trends over time across different countries and categories
          </p>
        </div>

        {/* Filters */}
        <div className="bg-secondary rounded-lg p-6 border border-gray-700 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Country
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full p-3 border border-gray-600 rounded-lg bg-primary text-white focus:ring-highlights focus:border-highlights"
              >
                {countries.map((country) => (
                  <option
                    key={country}
                    value={country}
                    className="bg-primary text-white"
                  >
                    {country}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Age Group
              </label>
              <select
                value={selectedAgeGroup}
                onChange={(e) => setSelectedAgeGroup(e.target.value)}
                className="w-full p-3 border border-gray-600 rounded-lg bg-primary text-white focus:ring-highlights focus:border-highlights"
              >
                {ageGroups.map((ageGroup) => (
                  <option
                    key={ageGroup}
                    value={ageGroup}
                    className="bg-primary text-white"
                  >
                    {ageGroup}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* Age Group Candlestick Chart */}
          <div className="bg-secondary rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              Age Group Trends - {selectedAgeGroup} (Candlestick)
            </h2>
            <div className="bg-white rounded-md p-4" style={{ width: "100%", height: 500, minHeight: 500 }}>
              <ResponsiveContainer width="100%" height={500}>
                <ComposedChart
                  data={candlestickData}
                  margin={{ top: 30, right: 50, left: 100, bottom: 70 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="year"
                    stroke="#9ca3af"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    axisLine={{ stroke: "#9ca3af", strokeWidth: 2 }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    width={80}
                    domain={[
                      (dataMin: number) => {
                        // Add 30% padding below minimum to prevent overlap
                        const paddedMin = dataMin * 0.7;
                        return Math.floor(paddedMin);
                      },
                      (dataMax: number) => {
                        // Add 30% padding above maximum
                        const paddedMax = dataMax * 1.3;
                        return Math.ceil(paddedMax);
                      },
                    ]}
                    label={{
                      value: "Emigrants",
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                      fill: "#fff",
                    }}
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    axisLine={{ stroke: "#9ca3af", strokeWidth: 2 }}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as OHLCData;
                        return (
                          <div
                            style={{
                              backgroundColor: "#1f2937",
                              border: "1px solid #374151",
                              borderRadius: "8px",
                              padding: "10px",
                              color: "#fff",
                            }}
                          >
                            <p style={{ marginBottom: "5px" }}>
                              <strong>Year: {data.year}</strong>
                            </p>
                            <p style={{ color: "#22c55e" }}>
                              High: {Math.round(data.high).toLocaleString()}
                            </p>
                            <p style={{ color: "#3b82f6" }}>
                              Open: {Math.round(data.open).toLocaleString()}
                            </p>
                            <p style={{ color: "#3b82f6" }}>
                              Close: {Math.round(data.close).toLocaleString()}
                            </p>
                            <p style={{ color: "#ef4444" }}>
                              Low: {Math.round(data.low).toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="high"
                    maxBarSize={30}
                    shape={(props: any) => <CandlestickShape {...props} />}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Data Summary */}
        <div className="bg-secondary rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Trend Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Countries Tracked</p>
              <p className="text-2xl font-bold text-white">
                {countries.length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Age Groups</p>
              <p className="text-2xl font-bold text-white">
                {ageGroups.length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Selected Country</p>
              <p className="text-2xl font-bold text-white">{selectedCountry}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Selected Age Group</p>
              <p className="text-2xl font-bold text-white">
                {selectedAgeGroup}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
