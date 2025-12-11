import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ResponsivePie } from "@nivo/pie";
import { useCompositionData } from "../hooks/useCompositionData";

// Pastel color scheme: Pink, Light Blue, Lavender, Mint Green, Peach, Soft Blue
const donutColorScheme = ["#F8BBD0", "#A8D5E2", "#E1BEE7", "#B2DFDB", "#FFCCBC", "#B3E5FC"];

export const Route = createFileRoute("/composition")({
  component: CompositionCharts,
});

function CompositionCharts() {
  const [selectedYear, setSelectedYear] = useState<number>(1981);
  const {
    destinationData,
    ageGroupData,
    civilStatusData,
    loading,
    error,
    years,
  } = useCompositionData(selectedYear);

  // Apply color scheme to all chart data
  const destinationDataWithColors = useMemo(() => {
    return destinationData.map((item, index) => ({
      ...item,
      color: donutColorScheme[index % donutColorScheme.length],
    }));
  }, [destinationData]);

  const ageGroupDataWithColors = useMemo(() => {
    return ageGroupData.map((item, index) => ({
      ...item,
      color: donutColorScheme[index % donutColorScheme.length],
    }));
  }, [ageGroupData]);

  const civilStatusDataWithColors = useMemo(() => {
    return civilStatusData.map((item, index) => ({
      ...item,
      color: donutColorScheme[index % donutColorScheme.length],
    }));
  }, [civilStatusData]);

  if (loading) {
    return (
      <div className="p-6 bg-primary min-h-screen flex items-center justify-center">
        <div className="text-gray-300">Loading composition data...</div>
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
            Composition Charts
          </h1>
          <p className="text-gray-300 text-lg">
            View data composition and proportions across different categories
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

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Destination Countries Pie Chart */}
          <div className="bg-secondary rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              Destination Countries Distribution ({selectedYear})
            </h2>
            <div className="h-80 bg-white rounded-md p-4">
              <ResponsivePie
                data={destinationDataWithColors}
                margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                innerRadius={0.6}
                padAngle={0.02}
                cornerRadius={0}
                activeOuterRadiusOffset={8}
                borderWidth={2}
                borderColor="#ffffff"
                arcLinkLabels={false}
                arcLabels={false}
                enableArcLabels={false}
                enableArcLinkLabels={false}
                isInteractive={true}
                tooltip={({ datum }) => (
                  <div style={{
                    background: 'white',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}>
                    <strong>{datum.label}</strong>: {datum.value.toLocaleString()}
                  </div>
                )}
                legends={[
                  {
                    anchor: "bottom",
                    direction: "row",
                    justify: false,
                    translateX: 0,
                    translateY: 56,
                    itemsSpacing: 0,
                    itemWidth: 100,
                    itemHeight: 18,
                    itemTextColor: "#333333",
                    itemDirection: "left-to-right",
                    itemOpacity: 1,
                    symbolSize: 18,
                    symbolShape: "circle",
                    effects: [
                      {
                        on: "hover",
                        style: {
                          itemTextColor: "#000",
                        },
                      },
                    ],
                  },
                ]}
              />
            </div>
          </div>

          {/* Age Groups Pie Chart */}
          <div className="bg-secondary rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              Age Groups Distribution ({selectedYear})
            </h2>
            <div className="h-80 bg-white rounded-md p-4">
              <ResponsivePie
                data={ageGroupDataWithColors}
                margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                innerRadius={0.6}
                padAngle={0.02}
                cornerRadius={0}
                activeOuterRadiusOffset={8}
                borderWidth={2}
                borderColor="#ffffff"
                arcLinkLabels={false}
                arcLabels={false}
                enableArcLabels={false}
                enableArcLinkLabels={false}
                isInteractive={true}
                tooltip={({ datum }) => (
                  <div style={{
                    background: 'white',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}>
                    <strong>{datum.label}</strong>: {datum.value.toLocaleString()}
                  </div>
                )}
                legends={[
                  {
                    anchor: "bottom",
                    direction: "row",
                    justify: false,
                    translateX: 0,
                    translateY: 56,
                    itemsSpacing: 0,
                    itemWidth: 100,
                    itemHeight: 18,
                    itemTextColor: "#333333",
                    itemDirection: "left-to-right",
                    itemOpacity: 1,
                    symbolSize: 18,
                    symbolShape: "circle",
                    effects: [
                      {
                        on: "hover",
                        style: {
                          itemTextColor: "#000",
                        },
                      },
                    ],
                  },
                ]}
              />
            </div>
          </div>

          {/* Civil Status Pie Chart */}
          <div className="bg-secondary rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              Civil Status Distribution ({selectedYear})
            </h2>
            <div className="h-80 bg-white rounded-md p-4">
              <ResponsivePie
                data={civilStatusDataWithColors}
                margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                innerRadius={0.6}
                padAngle={0.02}
                cornerRadius={0}
                activeOuterRadiusOffset={8}
                borderWidth={2}
                borderColor="#ffffff"
                arcLinkLabels={false}
                arcLabels={false}
                enableArcLabels={false}
                enableArcLinkLabels={false}
                isInteractive={true}
                tooltip={({ datum }) => (
                  <div style={{
                    background: 'white',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}>
                    <strong>{datum.label}</strong>: {datum.value.toLocaleString()}
                  </div>
                )}
                legends={[
                  {
                    anchor: "bottom",
                    direction: "row",
                    justify: false,
                    translateX: 0,
                    translateY: 56,
                    itemsSpacing: 0,
                    itemWidth: 100,
                    itemHeight: 18,
                    itemTextColor: "#333333",
                    itemDirection: "left-to-right",
                    itemOpacity: 1,
                    symbolSize: 18,
                    symbolShape: "circle",
                    effects: [
                      {
                        on: "hover",
                        style: {
                          itemTextColor: "#000",
                        },
                      },
                    ],
                  },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Data Summary */}
        <div className="bg-secondary rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Composition Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Total Destinations</p>
              <p className="text-2xl font-bold text-white">
                {destinationData.length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Age Groups</p>
              <p className="text-2xl font-bold text-white">
                {ageGroupData.length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Civil Statuses</p>
              <p className="text-2xl font-bold text-white">
                {civilStatusData.length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Top Destination</p>
              <p className="text-2xl font-bold text-white">
                {destinationData.length > 0 ? destinationData[0].label : "N/A"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Most Common Status</p>
              <p className="text-2xl font-bold text-white">
                {civilStatusData.length > 0 ? civilStatusData[0].label : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
