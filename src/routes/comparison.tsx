import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { useComparisonData } from "../hooks/useComparisonData";

export const Route = createFileRoute("/comparison")({
  component: ComparisonCharts,
});

function ComparisonCharts() {
  const [selectedYear, setSelectedYear] = useState<number>(2020);
  const { data, loading, error, years } = useComparisonData(selectedYear);

  if (loading) {
    return (
      <div className="p-6 bg-primary min-h-screen flex items-center justify-center">
        <div className="text-gray-300">Loading comparison data...</div>
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
          <h1 className="text-4xl font-bold text-white mb-2">
            Comparison Charts
          </h1>
          <p className="text-gray-300 text-lg">
            Compare emigrant data across different countries and categories
          </p>
        </div>

        {/* Filters */}
        <div className="bg-secondary rounded-lg p-6 border border-gray-700 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full p-3 border border-gray-600 rounded-lg bg-primary text-white focus:ring-highlights focus:border-highlights"
              >
                {years.map((year) => (
                  <option
                    key={year}
                    value={year}
                    className="bg-primary text-white"
                  >
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-secondary rounded-lg p-6 border border-gray-700 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Top Countries by Emigrants ({selectedYear})
          </h2>
          <div className="h-96 bg-white rounded-lg" style={{ backgroundColor: "#ffffff" }}>
            <ResponsiveBar
              data={data}
              keys={["emigrants"]}
              indexBy="country"
              margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
              padding={0.3}
              valueScale={{ type: "linear" }}
              indexScale={{ type: "band", round: true }}
              colors="#E5748F"
              borderColor={{
                from: "color",
                modifiers: [["darker", 1.6]],
              }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "Country",
                legendPosition: "middle",
                legendOffset: 32,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "Number of Emigrants",
                legendPosition: "middle",
                legendOffset: -40,
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{
                from: "color",
                modifiers: [["darker", 1.6]],
              }}
              legends={[
                {
                  dataFrom: "keys",
                  anchor: "bottom-right",
                  direction: "column",
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemDirection: "left-to-right",
                  itemOpacity: 0.85,
                  symbolSize: 20,
                  effects: [
                    {
                      on: "hover",
                      style: {
                        itemOpacity: 1,
                      },
                    },
                  ],
                },
              ]}
              theme={{
                background: "#ffffff",
                axis: {
                  domain: { line: { stroke: "#d0d0d0", strokeWidth: 1 } },
                  legend: { text: { fontSize: 12, fill: "#333333" } },
                  ticks: { line: { stroke: "#d0d0d0", strokeWidth: 1 }, text: { fontSize: 11, fill: "#333333" } },
                },
                grid: { line: { stroke: "#efefef", strokeWidth: 1 } },
                legends: { text: { fill: "#333333" } },
              }}
              role="application"
              ariaLabel="Emigrants comparison chart"
              barAriaLabel={(e) =>
                `Country: ${e.id}, Emigrants: ${e.formattedValue}`
              }
            />
          </div>
        </div>

        {/* Data Summary */}
        <div className="bg-secondary rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Data Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Total Countries</p>
              <p className="text-2xl font-bold text-white">{data.length}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Total Emigrants</p>
              <p className="text-2xl font-bold text-white">
                {data
                  .reduce((sum, item) => sum + item.emigrants, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Top Country</p>
              <p className="text-2xl font-bold text-white">
                {data.length > 0 ? data[0].country : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
