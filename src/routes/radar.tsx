import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ResponsiveRadar } from "@nivo/radar";
import { useYearFilter } from "../hooks/useYearFilter";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export const Route = createFileRoute("/radar")({
  component: RadarPage,
});

interface RadarData {
  category: string;
  [key: string]: string | number;
}

interface CountryData {
  country: string;
  total: number;
}

function RadarPage() {
  const [radarData, setRadarData] = useState<RadarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { selectedYear, setSelectedYear } = useYearFilter();
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    fetchRadarData();
  }, [selectedYear]);

  const fetchRadarData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch destination data - UPDATED: Use simpler collection path
      const destinationQuery = query(
        collection(db, "emigrantData_destination"),
        orderBy("Year")
      );
      const destinationSnapshot = await getDocs(destinationQuery);

      // Fetch age data - UPDATED: Use simpler collection path
      const ageQuery = query(
        collection(db, "emigrantData_age"),
        orderBy("Year")
      );
      const ageSnapshot = await getDocs(ageQuery);

      // Fetch education data - UPDATED: Use simpler collection path
      const educationQuery = query(
        collection(db, "emigrantData_education"),
        orderBy("Year")
      );
      const educationSnapshot = await getDocs(educationQuery);

      // Process destination data
      const destinationData =
        destinationSnapshot.docs.length > 0
          ? destinationSnapshot.docs.map((doc) => doc.data())
          : [];
      const countries = new Set<string>();
      const countryTotals: Record<string, number> = {};

      // UPDATED: Handle nested structure { Year: 2020, "COUNTRY_NAME": { emigrants: 12345 }, ... }
      destinationData.forEach((data: any) => {
        console.log("Processing data:", data);
        console.log("Selected year:", selectedYear, "Data year:", data.Year);
        if (
          !selectedYear ||
          selectedYear === "all" ||
          data.Year === selectedYear
        ) {
          console.log("Year matches, processing keys...");
          Object.entries(data).forEach(([key, value]) => {
            if (key === "Year") return;

            const emigrants =
              typeof value === "object" &&
              value !== null &&
              "emigrants" in value
                ? (value as { emigrants: number }).emigrants
                : null;

            console.log(
              "Processing key:",
              key,
              "emigrants:",
              emigrants,
              "type:",
              typeof emigrants
            );

            if (emigrants && typeof emigrants === "number" && emigrants > 0) {
              countries.add(key);
              countryTotals[key] = (countryTotals[key] || 0) + emigrants;
              console.log(
                "Added to countryTotals:",
                key,
                "=",
                countryTotals[key]
              );
            }
          });
        } else {
          console.log("Year doesn't match, skipping...");
        }
      });

      // Process age data
      const ageData =
        ageSnapshot.docs.length > 0
          ? ageSnapshot.docs.map((doc) => doc.data())
          : [];
      const ageTotals: Record<string, number> = {};

      // UPDATED: Handle nested structure
      ageData.forEach((data: any) => {
        if (
          !selectedYear ||
          selectedYear === "all" ||
          data.Year === selectedYear
        ) {
          Object.entries(data).forEach(([key, value]) => {
            if (key === "Year") return;

            const emigrants =
              typeof value === "object" &&
              value !== null &&
              "emigrants" in value
                ? (value as { emigrants: number }).emigrants
                : null;

            if (emigrants && typeof emigrants === "number" && emigrants > 0) {
              ageTotals[key] = (ageTotals[key] || 0) + emigrants;
            }
          });
        }
      });

      // Process education data
      const educationData =
        educationSnapshot.docs.length > 0
          ? educationSnapshot.docs.map((doc) => doc.data())
          : [];
      const educationTotals: Record<string, number> = {};

      // UPDATED: Handle nested structure
      educationData.forEach((data: any) => {
        if (
          !selectedYear ||
          selectedYear === "all" ||
          data.Year === selectedYear
        ) {
          Object.entries(data).forEach(([key, value]) => {
            if (key === "Year") return;

            const emigrants =
              typeof value === "object" &&
              value !== null &&
              "emigrants" in value
                ? (value as { emigrants: number }).emigrants
                : null;

            if (emigrants && typeof emigrants === "number" && emigrants > 0) {
              educationTotals[key] = (educationTotals[key] || 0) + emigrants;
            }
          });
        }
      });

      // Create radar data - show top countries with their values
      const radarDataArray: RadarData[] = [];

      // Get top 5 countries
      const topCountries = Object.entries(countryTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      // Create data for each top country
      topCountries.forEach(([country, total]) => {
        // Ensure total is a valid number
        const validTotal =
          typeof total === "number" && !isNaN(total) ? total : 0;
        const countryData: RadarData = {
          category: country,
          "Total Emigrants": validTotal,
        };
        radarDataArray.push(countryData);
      });

      // Debug: Log the data being processed
      console.log("Destination data:", destinationData.length, "docs");
      console.log("First few docs:", destinationData.slice(0, 3));
      console.log("Country totals:", countryTotals);
      console.log("Top countries:", topCountries);
      console.log("Radar data array:", radarDataArray);

      // Extract available years from the data
      const years = new Set<number>();
      if (destinationSnapshot.docs.length > 0) {
        destinationSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.Year && typeof data.Year === "number") {
            years.add(data.Year);
          }
        });
      }
      setAvailableYears(Array.from(years).sort((a, b) => a - b));

      // If no data available, show sample data
      if (
        radarDataArray.length === 0 ||
        Object.keys(countryTotals).length === 0
      ) {
        console.log("No valid data found, showing sample data");
        const sampleData: RadarData[] = [
          { category: "Sample Country 1", "Total Emigrants": 1000 },
          { category: "Sample Country 2", "Total Emigrants": 800 },
          { category: "Sample Country 3", "Total Emigrants": 600 },
        ];
        setRadarData(sampleData);
      } else {
        console.log("Setting real data:", radarDataArray);
        setRadarData(radarDataArray);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      // Set fallback data on error
      const fallbackData: RadarData[] = [
        { category: "No Data", "Total Emigrants": 0 },
      ];
      setRadarData(fallbackData);
      setAvailableYears([]); // Set empty years array on error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-highlights mx-auto"></div>
          <p className="mt-4 text-white text-lg">Loading radar chart data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg">Error: {error}</p>
          <button
            onClick={fetchRadarData}
            className="mt-4 px-4 py-2 bg-highlights text-primary rounded-lg hover:bg-highlights/80"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Ranking Analysis
          </h1>
          <p className="text-white text-lg">
            Multi-dimensional ranking comparison of emigrant data across
            different categories using radar charts.
          </p>
        </div>

        {/* Year Filter */}
        <div className="mb-6">
          <label className="block text-white font-medium mb-2">
            Select Year:
          </label>
          <select
            value={selectedYear || "all"}
            onChange={(e) =>
              setSelectedYear(
                e.target.value === "all" ? "all" : parseInt(e.target.value)
              )
            }
            className="px-4 py-2 bg-secondary border border-highlights rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-highlights"
          >
            <option value="all" className="text-white">
              All Years
            </option>
            {availableYears.map((year) => (
              <option key={year} value={year} className="text-white">
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Chart Description */}
        <div className="mb-6">
          <p className="text-white text-sm">
            Showing top 5 countries by total emigrant count
          </p>
        </div>

        {/* No Data Message */}
        {radarData.length === 0 && !loading && (
          <div className="bg-secondary rounded-lg p-6 shadow-lg text-center">
            <h3 className="text-xl font-semibold text-white mb-3">
              No Data Available
            </h3>
            <p className="text-white mb-4">
              Please upload CSV files to see ranking analysis.
            </p>
            <a
              href="/upload"
              className="inline-block px-4 py-2 bg-highlights text-primary rounded-lg hover:bg-highlights/80 transition-colors"
            >
              Go to Upload Page
            </a>
          </div>
        )}

        {/* Radar Chart */}
        {radarData.length > 0 && (
          <div className="bg-secondary rounded-lg p-6 shadow-lg">
            <div className="h-96">
              <ResponsiveRadar
                data={radarData}
                keys={["Total Emigrants"]}
                indexBy="category"
                valueFormat=">-.0f"
                margin={{ top: 70, right: 80, bottom: 70, left: 80 }}
                borderColor={{ from: "color" }}
                gridLabelOffset={36}
                dotSize={10}
                dotColor={{ theme: "background" }}
                dotBorderWidth={2}
                colors={{ scheme: "nivo" }}
                blendMode="multiply"
                motionConfig="wobbly"
                theme={{
                  axis: {
                    domain: { line: { stroke: "#fff", strokeWidth: 1 } },
                    legend: { text: { fill: "#fff", fontSize: 14 } },
                    ticks: {
                      line: { stroke: "#fff", strokeWidth: 1 },
                      text: { fill: "#fff", fontSize: 12 },
                    },
                  },
                  legends: {
                    text: { fill: "#fff" },
                  },
                  grid: {
                    line: { stroke: "#fff", strokeWidth: 0.6, opacity: 0.4 },
                  },
                  labels: {
                    text: { fill: "#fff" },
                  },
                  dots: {
                    text: { fill: "#fff" },
                  },
                }}
                legends={[
                  {
                    anchor: "top-left",
                    direction: "column",
                    translateX: -50,
                    translateY: -40,
                    itemWidth: 80,
                    itemHeight: 20,
                    itemTextColor: "#fff",
                    symbolSize: 12,
                    symbolShape: "circle",
                    effects: [
                      {
                        on: "hover",
                        style: {
                          itemTextColor: "#fff",
                        },
                      },
                    ],
                  },
                ]}
              />
            </div>
          </div>
        )}

        {/* Chart Description */}
        <div className="mt-6 bg-secondary rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-3">
            How to Read This Chart
          </h3>
          <ul className="text-white space-y-2">
            <li>
              • <strong>Spider/Web Shape:</strong> Each axis represents a
              different data category
            </li>
            <li>
              • <strong>Area Coverage:</strong> Larger areas indicate higher
              values across multiple dimensions
            </li>
            <li>
              • <strong>Shape Comparison:</strong> Different shapes reveal
              unique patterns for each country
            </li>
            <li>
              • <strong>Overlap Analysis:</strong> Overlapping areas show
              similar characteristics between countries
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
