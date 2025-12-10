import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import ChoroplethMap from "../components/charts/choroplethMap";
import PHOriginChoropleth from "../components/charts/originChoropleth";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useComparisonData } from "../hooks/useComparisonData";

export const Route = createFileRoute("/geographic")({
  component: GeographicVisualization,
});

const choroplethComponents = {
  destination: <ChoroplethMap />,
  origin: <PHOriginChoropleth />,
};

type ChoroplethKey = keyof typeof choroplethComponents;

function GeographicVisualization() {
  const [selectedMap, setSelectedMap] = useState<ChoroplethKey>("destination");
  const stats = useDashboardStats();
  const { data: topDestinations } = useComparisonData();

  // Ensure unique countries and take top 4
  const topFour = useMemo(() => {
    const unique = new Map<string, (typeof topDestinations)[0]>();
    topDestinations.forEach((item) => {
      if (!unique.has(item.country)) {
        unique.set(item.country, item);
      }
    });
    return Array.from(unique.values()).slice(0, 4);
  }, [topDestinations]);

  return (
    <div className="p-6 bg-primary min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Geographic Visualization
          </h1>
          <p className="text-gray-300 text-lg">
            Interactive choropleth maps showing Filipino emigrant data by
            destination countries and origin provinces
          </p>
        </div>

        {/* Map Type Selector */}
        <div className="bg-secondary rounded-lg p-6 border border-gray-700 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Select Map Type
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Map Type
              </label>
              <select
                id="map-selector"
                value={selectedMap}
                onChange={(e) =>
                  setSelectedMap(e.target.value as ChoroplethKey)
                }
                className="w-full p-3 border border-gray-600 rounded-lg shadow-sm focus:ring-highlights focus:border-highlights text-white bg-primary"
              >
                {Object.keys(choroplethComponents).map((key) => (
                  <option
                    key={key}
                    className="bg-primary text-white"
                    value={key}
                  >
                    {key === "destination"
                      ? "Destination Countries"
                      : "Origin Provinces"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Data Year
              </label>
              <select className="w-full p-3 border border-gray-600 rounded-lg bg-primary text-white focus:ring-highlights focus:border-highlights">
                <option value="2020">2020</option>
                <option value="2019">2019</option>
                <option value="2018">2018</option>
              </select>
            </div>
          </div>
        </div>

        {/* Map Description removed as requested */}

        {/* Main Map Display */}
        <div className="bg-secondary rounded-lg p-6 border border-gray-700">
          <div className="bg-primary rounded-lg p-4">
            {choroplethComponents[selectedMap]}
          </div>
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-secondary rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Map Statistics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Countries Covered</span>
                <span className="text-white font-semibold">
                  {stats.isLoading ? "—" : stats.totalCountries}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Philippine Provinces</span>
                <span className="text-white font-semibold">
                  {stats.isLoading ? "—" : stats.totalProvinces}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Data Years Available</span>
                <span className="text-white font-semibold">
                  {stats.isLoading ? "—" : stats.dataYears}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Emigrants Tracked</span>
                <span className="text-white font-semibold">
                  {stats.isLoading ? "—" : `${stats.totalEmigrants}M`}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-secondary rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Top Destinations
            </h3>
            <div className="space-y-3">
              {topFour.length === 0 ? (
                <div className="text-gray-400">No data available</div>
              ) : (
                topFour.map((item, index) => (
                  <div
                    key={`${item.country}-${item.year}-${index}`}
                    className="flex justify-between items-center"
                  >
                    <span className="text-gray-300">{item.country}</span>
                    <span className="text-white font-semibold">
                      {typeof item.emigrants === "number"
                        ? item.emigrants.toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
