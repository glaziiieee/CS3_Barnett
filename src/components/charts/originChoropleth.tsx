import { useCallback, useMemo } from "react";
import { ResponsiveChoropleth } from "@nivo/geo";
import { useParseOriginProvinceData } from "../../hooks/useParseOriginProvinceData";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useGeoJSON } from "../../hooks/useGeoJSON";
import { useYearFilter } from "../../hooks/useYearFilter";
import LoadingScreen from "../loadingScreen";
import normalizeProvinceName from "../../utils/normalizeProvince";

const normalizeName = (s: string) => normalizeProvinceName(s);

/**
 * Region to Province Mapping
 *
 * This mapping is used to distribute regional emigrant data to individual provinces.
 *
 * Background:
 * - The source CSV data (PlaceOfOrigin-Clean.csv) contains data at the REGION level
 * - This choropleth map displays data at the PROVINCE level
 * - To bridge this gap, regional totals are evenly distributed across provinces
 *
 * Example: If "Region I - Ilocos Region" has 1000 emigrants, and it contains 4 provinces,
 * each province receives 1000/4 = 250 emigrants for visualization purposes.
 *
 * Keys are NORMALIZED (uppercase, no dashes) to match Firebase data format.
 */
const regionToProvinces: Record<string, string[]> = {
  "REGION I ILOCOS REGION": [
    "Ilocos Norte",
    "Ilocos Sur",
    "La Union",
    "Pangasinan",
  ],
  "REGION II CAGAYAN VALLEY": [
    "Batanes",
    "Cagayan",
    "Isabela",
    "Nueva Vizcaya",
    "Quirino",
  ],
  "REGION III CENTRAL LUZON": [
    "Aurora",
    "Bataan",
    "Bulacan",
    "Nueva Ecija",
    "Pampanga",
    "Tarlac",
    "Zambales",
  ],
  "REGION IV A CALABARZON": ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal"],
  "REGION IV B MIMAROPA": [
    "Marinduque",
    "Occidental Mindoro",
    "Oriental Mindoro",
    "Palawan",
    "Romblon",
  ],
  "REGION V BICOL REGION": [
    "Albay",
    "Camarines Norte",
    "Camarines Sur",
    "Catanduanes",
    "Masbate",
    "Sorsogon",
  ],
  "REGION VI WESTERN VISAYAS": [
    "Aklan",
    "Antique",
    "Capiz",
    "Guimaras",
    "Iloilo",
    "Negros Occidental",
  ],
  "REGION VII CENTRAL VISAYAS": [
    "Bohol",
    "Cebu",
    "Negros Oriental",
    "Siquijor",
  ],
  "REGION VIII EASTERN VISAYAS": [
    "Biliran",
    "Eastern Samar",
    "Leyte",
    "Northern Samar",
    "Samar",
    "Southern Leyte",
  ],
  "REGION IX ZAMBOANGA PENINSULA": [
    "Zamboanga del Norte",
    "Zamboanga del Sur",
    "Zamboanga Sibugay",
  ],
  "REGION X NORTHERN MINDANAO": [
    "Bukidnon",
    "Camiguin",
    "Lanao del Norte",
    "Misamis Occidental",
    "Misamis Oriental",
  ],
  "REGION XI DAVAO REGION": [
    "Davao de Oro",
    "Davao del Norte",
    "Davao del Sur",
    "Davao Occidental",
    "Davao Oriental",
  ],
  "REGION XII SOCCSKSARGEN": [
    "Cotabato",
    "Sarangani",
    "South Cotabato",
    "Sultan Kudarat",
  ],
  "REGION XIII CARAGA": [
    "Agusan del Norte",
    "Agusan del Sur",
    "Dinagat Islands",
    "Surigao del Norte",
    "Surigao del Sur",
  ],
  "CORDILLERA ADMINISTRATIVE REGION": [
    "Abra",
    "Apayao",
    "Benguet",
    "Ifugao",
    "Kalinga",
    "Mountain Province",
  ],
  "NATIONAL CAPITAL REGION": ["Metro Manila"],
  "AUTONOMOUS REGION IN MUSLIM MINDANAO": [
    "Basilan",
    "Lanao del Sur",
    "Maguindanao del Norte",
    "Maguindanao del Sur",
    "Sulu",
    "Tawi-Tawi",
  ],
};

const PHOriginChoropleth = () => {
  const { selectedYear, onSelectChange } = useYearFilter("all");
  const {
    totals,
    years,
    loading,
    error: dataError,
  } = useParseOriginProvinceData(selectedYear);
  const isMobile = useIsMobile();

  const transform = useCallback((fc: any) => {
    const seen = new Set<string>();
    return (fc?.features || [])
      .filter(
        (feat: any) =>
          (feat?.properties?.ENGTYPE_1 || "").toUpperCase() === "PROVINCE" &&
          feat?.properties?.PROVINCE
      )
      .map((feat: any) => {
        const normalizedId = normalizeName(feat.properties.PROVINCE);
        if (seen.has(normalizedId)) {
          console.warn(`Duplicate province: ${feat.properties.PROVINCE}`);
          return null;
        }
        seen.add(normalizedId);
        return {
          ...feat,
          id: normalizedId,
        };
      })
      .filter((feat: any) => feat !== null);
  }, []);

  const {
    data: features,
    loading: geoLoading,
    error: geoError,
  } = useGeoJSON<any[]>("/data/Provinces.json", transform);

  /**
   * Data Transformation: Region → Province Distribution
   *
   * This transforms regional-level emigrant data into province-level data for visualization.
   *
   * Process:
   * 1. Loop through each data entry (which is at region level from CSV)
   * 2. Match the key to a region in regionToProvinces mapping
   * 3. Divide the regional total evenly among its provinces
   * 4. Aggregate the values for each province
   *
   * This ensures the choropleth map shows province-level granularity even though
   * the source data is at the regional level.
   */
  const { provinceData, min, max } = useMemo(() => {
    console.log("📊 Raw totals from hook:", totals);

    const provinceMap: Record<string, number> = {};

    // Distribute regional data to provinces
    Object.entries(totals).forEach(([key, value]) => {
      console.log(`Processing key: "${key}" with value: ${value}`);

      // Try to match the key to a region
      const provinces = regionToProvinces[key];

      if (provinces && provinces.length > 0) {
        // Regional data: distribute evenly to all provinces in the region
        const valuePerProvince = value / provinces.length;
        provinces.forEach((province) => {
          const normalizedKey = normalizeName(province);
          provinceMap[normalizedKey] =
            (provinceMap[normalizedKey] || 0) + valuePerProvince;
        });
        console.log(
          `✅ Distributed "${key}" across ${provinces.length} provinces (${valuePerProvince.toFixed(2)} each)`
        );
      } else {
        // Not a region - treat as direct province data
        const normalizedKey = normalizeName(key);
        provinceMap[normalizedKey] = (provinceMap[normalizedKey] || 0) + value;
        console.log(
          `⚠️ Treating "${key}" as direct province: ${normalizedKey}`
        );
      }
    });

    console.log("📍 Final province map:", provinceMap);

    const values = Object.values(provinceMap);
    return {
      provinceData: provinceMap,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 100,
    };
  }, [totals]);

  if (geoError)
    return <div className="text-red-500 p-6">Error: {geoError}</div>;
  if (dataError)
    return <div className="text-red-500 p-6">Error: {dataError}</div>;
  if (loading || geoLoading || !features) return <LoadingScreen />;

  const data = Object.entries(provinceData).map(([name, total]) => ({
    id: name,
    value: total,
    total,
  }));

  console.log("🗺️ Map data:", data);
  console.log("🗺️ Features count:", features.length);
  console.log("🗺️ Feature IDs:", features.map((f: any) => f.id).slice(0, 10));

  return (
    <div className="bg-primary rounded-lg shadow-md p-6 border-2 border-highlights">
      <h2 className="text-lg text-center font-inter text-stroke text-white mb-4">
        {selectedYear === "all"
          ? "Emigrant Origin Density by Province (1988 - 2020)"
          : `Emigrant Origin Density by Province in ${selectedYear}`}
      </h2>

      {/* Year Filter Dropdown */}
      <div className="mb-4 flex justify-center">
        <select
          value={selectedYear}
          onChange={onSelectChange}
          className="px-4 py-2 bg-secondary border border-highlights rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-highlights"
        >
          <option value="all">All Years (1988-2020)</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className={isMobile ? "overflow-x-auto" : ""}>
        <div style={{ width: isMobile ? "600px" : "100%", height: "600px" }}>
          <ResponsiveChoropleth
            data={data}
            features={features}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            colors={["#f3c6d8", "#f7d3e3", "#ffd6eb", "#ffe6f4", "#fff5fb"]}
            domain={[min, max]}
            unknownColor="#f3c6d8"
            label="properties.PROVINCE"
            valueFormat={(v) => Number(v).toLocaleString()}
            tooltip={({ feature }: any) => (
              <div
                style={{
                  background: "#fff5fb",
                  border: "1px solid #ffd6eb",
                  borderRadius: "8px",
                  padding: "10px",
                  color: "#333333",
                }}
              >
                <strong>{feature.properties?.PROVINCE}</strong>
                <br />
                ID: {feature.id}
                <br />
                Total: {feature.data?.total?.toLocaleString() || "N/A"}
              </div>
            )}
            projectionScale={2000}
            projectionTranslation={[0.5, 0.72]}
            projectionRotation={[-122, -8.5, 0]}
            enableGraticule={false}
            borderWidth={0.5}
            borderColor="#ffd6eb"
            theme={{
              background: "transparent",
              text: {
                fontSize: 12,
                fill: "#333333",
              },
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6" style={{ backgroundColor: "#fff5fb" }}></div>
          <span className="text-sm">Extreme (≥1M)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6" style={{ backgroundColor: "#ffe6f4" }}></div>
          <span className="text-sm">Significant (≥500K)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6" style={{ backgroundColor: "#ffd6eb" }}></div>
          <span className="text-sm">Moderate (≥100K)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6" style={{ backgroundColor: "#f7d3e3" }}></div>
          <span className="text-sm">Slight (≥10K)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6" style={{ backgroundColor: "#f3c6d8" }}></div>
          <span className="text-sm">Nil (&lt;10K)</span>
        </div>
      </div>
    </div>
  );
};

export default PHOriginChoropleth;
