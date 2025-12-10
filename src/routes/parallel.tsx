import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
import { useYearFilter } from "../hooks/useYearFilter";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export const Route = createFileRoute("/parallel")({
  component: ParallelSetsPage,
});

interface SankeyNode {
  id: string;
  nodeColor: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// Cache for Firebase data
const dataCache = new Map<string, any[]>();
const cacheTimestamp = new Map<string, number>();
const CACHE_DURATION = 5 * 60 * 1000;

function ParallelSetsPage() {
  const [sankeyData, setSankeyData] = useState<SankeyData>({
    nodes: [],
    links: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<
    "destination-age" | "destination-education" | "age-education"
  >("destination-age");

  const { selectedYear, setSelectedYear } = useYearFilter();
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [countryLimit, setCountryLimit] = useState<number>(8);
  const [categoryLimit, setCategoryLimit] = useState<number>(8);
  const [excludedCountriesInput, setExcludedCountriesInput] =
    useState<string>("");

  const excludedCountries = useMemo(() => {
    return excludedCountriesInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [excludedCountriesInput]);

  const fetchCachedData = useCallback(async (collectionPath: string) => {
    const cacheKey = collectionPath;
    const now = Date.now();

    if (dataCache.has(cacheKey) && cacheTimestamp.has(cacheKey)) {
      const cacheAge = now - cacheTimestamp.get(cacheKey)!;
      if (cacheAge < CACHE_DURATION) {
        console.log(`Using cached data for ${collectionPath}`);
        return dataCache.get(cacheKey)!;
      }
    }

    console.log(`Fetching fresh data for ${collectionPath}`);
    const q = query(collection(db, collectionPath), orderBy("Year"));
    const snapshot = await getDocs(q);
    const data =
      snapshot.docs.length > 0 ? snapshot.docs.map((doc) => doc.data()) : [];

    dataCache.set(cacheKey, data);
    cacheTimestamp.set(cacheKey, now);

    return data;
  }, []);

  useEffect(() => {
    fetchParallelData();
  }, [
    selectedYear,
    selectedFlow,
    countryLimit,
    categoryLimit,
    excludedCountries,
  ]);

  const fetchParallelData = async () => {
    try {
      setLoading(true);
      setError(null);

      // UPDATED: Use simpler collection paths
      const [destinationData, ageData, educationData] = await Promise.all([
        fetchCachedData("emigrantData_destination"),
        fetchCachedData("emigrantData_age"),
        fetchCachedData("emigrantData_education"),
      ]);

      console.log("🔍 Raw data loaded:", {
        destination: destinationData.length,
        age: ageData.length,
        education: educationData.length,
      });

      // NEW: Detailed education data inspection
      console.log(
        "📋 Education data sample (first 2 docs):",
        educationData.slice(0, 2).map((doc) => ({
          Year: doc.Year,
          yearType: typeof doc.Year,
          allKeys: Object.keys(doc),
          nonYearKeys: Object.keys(doc)
            .filter((k) => k !== "Year")
            .slice(0, 5),
          sampleValues: Object.entries(doc)
            .filter(([k]) => k !== "Year")
            .slice(0, 3)
            .map(([k, v]) => `${k}: ${v}`),
        }))
      );

      const nodes: SankeyNode[] = [];
      const links: SankeyLink[] = [];

      const colors = {
        destination: "#e74c3c",
        age: "#3498db",
        education: "#2ecc71",
      };

      // Helper function to aggregate data by year filter
      // UPDATED: Handle nested structure { Year: 2020, "KEY": { emigrants: 12345 }, ... }
      const aggregateData = (data: any[], yearFilter: number | "all") => {
        const aggregated = new Map<string, number>();

        data.forEach((doc: any) => {
          if (yearFilter === "all" || doc.Year === yearFilter) {
            Object.entries(doc).forEach(([key, value]) => {
              if (key === "Year") return;

              const emigrants =
                typeof value === "object" &&
                value !== null &&
                "emigrants" in value
                  ? (value as { emigrants: number }).emigrants
                  : null;

              if (emigrants && typeof emigrants === "number" && emigrants > 0) {
                aggregated.set(key, (aggregated.get(key) || 0) + emigrants);
              }
            });
          }
        });

        return aggregated;
      };

      const destTotals = aggregateData(destinationData, selectedYear);
      const ageTotals = aggregateData(ageData, selectedYear);
      const eduTotals = aggregateData(educationData, selectedYear);

      console.log("📊 Aggregated totals:", {
        destinations: destTotals.size,
        ages: ageTotals.size,
        education: eduTotals.size,
      });

      // NEW: Detailed education aggregation inspection
      console.log(
        "📊 Education totals (first 5 entries):",
        Array.from(eduTotals.entries()).slice(0, 5)
      );
      console.log("🔍 Selected year filter:", selectedYear);
      console.log(
        "🔍 Education data years present:",
        [...new Set(educationData.map((d) => d.Year))].sort()
      );

      // NEW: Check for empty education totals when using education flows
      if (
        eduTotals.size === 0 &&
        (selectedFlow === "destination-education" ||
          selectedFlow === "age-education")
      ) {
        console.error("❌ Education totals is EMPTY for education-based flow!");
        console.log("🐛 Debugging education data structure:", {
          totalDocs: educationData.length,
          sampleDoc: educationData[0],
          yearFilter: selectedYear,
          allYears: educationData.map((d) => d.Year),
          sampleDocEntries: educationData[0]
            ? Object.entries(educationData[0]).slice(0, 5)
            : [],
        });
      }

      if (selectedFlow === "destination-age") {
        // Get top destinations
        const topDestinations = Array.from(destTotals.entries())
          .filter(([country]) => !excludedCountries.includes(country))
          .sort(([, a], [, b]) => b - a)
          .slice(0, countryLimit);

        // Get top age groups
        const topAges = Array.from(ageTotals.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, categoryLimit);

        // Create nodes
        topDestinations.forEach(([dest]) => {
          nodes.push({ id: `dest-${dest}`, nodeColor: colors.destination });
        });
        topAges.forEach(([age]) => {
          nodes.push({ id: `age-${age}`, nodeColor: colors.age });
        });

        // Create realistic links using simple distribution
        // For each destination, distribute its emigrants across age groups proportionally
        topDestinations.forEach(([dest, destTotal]) => {
          const totalAgeValue = topAges.reduce((sum, [, val]) => sum + val, 0);

          topAges.forEach(([age, ageTotal]) => {
            // Each destination's emigrants are distributed to age groups
            // based on the age group's share of total emigrants
            const flowValue = (destTotal * ageTotal) / totalAgeValue;

            if (flowValue >= 10) {
              // Minimum threshold to reduce clutter
              links.push({
                source: `dest-${dest}`,
                target: `age-${age}`,
                value: Math.round(flowValue),
              });
            }
          });
        });

        console.log("✅ Destination-Age flow created:", {
          destinations: topDestinations.length,
          ages: topAges.length,
          links: links.length,
        });
      } else if (selectedFlow === "destination-education") {
        const topDestinations = Array.from(destTotals.entries())
          .filter(([country]) => !excludedCountries.includes(country))
          .sort(([, a], [, b]) => b - a)
          .slice(0, countryLimit);

        const topEducation = Array.from(eduTotals.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, categoryLimit);

        console.log("🎓 Destination-Education flow data:", {
          topDestinations: topDestinations.map(([d, v]) => `${d}: ${v}`),
          topEducation: topEducation.map(([e, v]) => `${e}: ${v}`),
        });

        topDestinations.forEach(([dest]) => {
          nodes.push({ id: `dest-${dest}`, nodeColor: colors.destination });
        });
        topEducation.forEach(([edu]) => {
          nodes.push({ id: `edu-${edu}`, nodeColor: colors.education });
        });

        topDestinations.forEach(([dest, destTotal]) => {
          const totalEduValue = topEducation.reduce(
            (sum, [, val]) => sum + val,
            0
          );

          topEducation.forEach(([edu, eduTotal]) => {
            const flowValue = (destTotal * eduTotal) / totalEduValue;

            if (flowValue >= 10) {
              links.push({
                source: `dest-${dest}`,
                target: `edu-${edu}`,
                value: Math.round(flowValue),
              });
            }
          });
        });

        console.log("✅ Destination-Education flow created:", {
          destinations: topDestinations.length,
          education: topEducation.length,
          links: links.length,
        });
      } else if (selectedFlow === "age-education") {
        const topAges = Array.from(ageTotals.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, categoryLimit);

        const topEducation = Array.from(eduTotals.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, categoryLimit);

        console.log("🎓 Age-Education flow data:", {
          topAges: topAges.map(([a, v]) => `${a}: ${v}`),
          topEducation: topEducation.map(([e, v]) => `${e}: ${v}`),
        });

        topAges.forEach(([age]) => {
          nodes.push({ id: `age-${age}`, nodeColor: colors.age });
        });
        topEducation.forEach(([edu]) => {
          nodes.push({ id: `edu-${edu}`, nodeColor: colors.education });
        });

        topAges.forEach(([age, ageTotal]) => {
          const totalEduValue = topEducation.reduce(
            (sum, [, val]) => sum + val,
            0
          );

          topEducation.forEach(([edu, eduTotal]) => {
            const flowValue = (ageTotal * eduTotal) / totalEduValue;

            if (flowValue >= 10) {
              links.push({
                source: `age-${age}`,
                target: `edu-${edu}`,
                value: Math.round(flowValue),
              });
            }
          });
        });

        console.log("✅ Age-Education flow created:", {
          ages: topAges.length,
          education: topEducation.length,
          links: links.length,
        });
      }

      console.log("✅ Final Sankey data:", {
        nodes: nodes.length,
        links: links.length,
        totalFlow: links.reduce((sum, link) => sum + link.value, 0),
      });

      // Extract available years
      const years = new Set<number>();
      [...destinationData, ...ageData, ...educationData].forEach(
        (data: any) => {
          if (data.Year && typeof data.Year === "number") {
            years.add(data.Year);
          }
        }
      );
      setAvailableYears(Array.from(years).sort((a, b) => a - b));

      // Set the data
      if (nodes.length > 0 && links.length > 0) {
        setSankeyData({ nodes, links });
      } else {
        // Fallback: create minimal demo data
        console.warn("⚠️ No valid data, using fallback");
        setSankeyData({
          nodes: [
            { id: "sample-1", nodeColor: "#e74c3c" },
            { id: "sample-2", nodeColor: "#3498db" },
          ],
          links: [{ source: "sample-1", target: "sample-2", value: 100 }],
        });
      }
    } catch (err) {
      console.error("❌ Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      setSankeyData({
        nodes: [
          { id: "error-1", nodeColor: "#999" },
          { id: "error-2", nodeColor: "#999" },
        ],
        links: [{ source: "error-1", target: "error-2", value: 1 }],
      });
      setAvailableYears([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-highlights mx-auto"></div>
          <p className="mt-4 text-text text-lg">
            Loading parallel sets data...
          </p>
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
            onClick={fetchParallelData}
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
            Flow/Process Analysis
          </h1>
          <p className="text-white text-lg">
            Visualize emigrant flows between categories. Note: Flow values are
            estimated based on proportional distribution of available data.
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 bg-secondary rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
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
                className="w-full px-4 py-2 bg-primary border border-highlights rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-highlights"
              >
                <option value="all">All Years</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Select Flow Type:
              </label>
              <select
                value={selectedFlow}
                onChange={(e) => setSelectedFlow(e.target.value as any)}
                className="w-full px-4 py-2 bg-primary border border-highlights rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-highlights"
              >
                <option value="destination-age">Destination → Age</option>
                <option value="destination-education">
                  Destination → Education
                </option>
                <option value="age-education">Age → Education</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-white font-medium mb-2">
                Max Destinations: {countryLimit}
              </label>
              <input
                type="range"
                min={3}
                max={15}
                value={countryLimit}
                onChange={(e) => setCountryLimit(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Max Categories: {categoryLimit}
              </label>
              <input
                type="range"
                min={3}
                max={12}
                value={categoryLimit}
                onChange={(e) => setCategoryLimit(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Exclude Countries:
              </label>
              <input
                type="text"
                placeholder="e.g., USA, CANADA"
                value={excludedCountriesInput}
                onChange={(e) => setExcludedCountriesInput(e.target.value)}
                className="w-full px-3 py-2 bg-primary border border-highlights rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-highlights"
              />
            </div>
          </div>
        </div>

        {/* Sankey Chart */}
        {sankeyData.nodes.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="h-[700px]">
              <ResponsiveSankey
                data={sankeyData}
                margin={{ top: 40, right: 200, bottom: 40, left: 200 }}
                align="justify"
                colors={{ scheme: "category10" }}
                nodeOpacity={1}
                nodeHoverOthersOpacity={0.35}
                nodeThickness={18}
                nodeSpacing={24}
                nodeBorderWidth={0}
                nodeBorderColor={{
                  from: "color",
                  modifiers: [["darker", 0.8]],
                }}
                nodeBorderRadius={3}
                linkOpacity={0.5}
                linkHoverOthersOpacity={0.1}
                linkContract={3}
                enableLinkGradient={true}
                labelPosition="outside"
                labelOrientation="horizontal"
                labelPadding={16}
                labelTextColor={{ from: "color", modifiers: [["darker", 1]] }}
                legends={[
                  {
                    anchor: "bottom-right",
                    direction: "column",
                    translateX: 130,
                    itemWidth: 100,
                    itemHeight: 14,
                    itemDirection: "right-to-left",
                    itemsSpacing: 2,
                    itemTextColor: "#999",
                    symbolSize: 14,
                    effects: [
                      {
                        on: "hover",
                        style: { itemTextColor: "#000" },
                      },
                    ],
                  },
                ]}
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-secondary rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-3">
            Understanding This Chart
          </h3>
          <ul className="text-white space-y-2">
            <li>
              • <strong>Flow Width:</strong> Wider bands indicate larger volumes
              of emigrants
            </li>
            <li>
              • <strong>Proportional Distribution:</strong> Flows are estimated
              by distributing emigrants proportionally based on category totals
            </li>
            <li>
              • <strong>Hover for Details:</strong> Mouse over bands to see
              exact flow values
            </li>
            <li>
              • <strong>Adjust Limits:</strong> Use the sliders above to show
              more or fewer categories
            </li>
            <li>
              • <strong>Note:</strong> This visualization estimates flows since
              we don't have cross-tabulated data showing exact destination-age
              or destination-education combinations
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
