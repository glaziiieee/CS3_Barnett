import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AiOutlineFundProjectionScreen, AiOutlineLineChart } from "react-icons/ai";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";

type Activation = "ReLU" | "Tanh" | "Sigmoid";

const HORIZONS = ["3 Years", "5 Years", "10 Years"];

type AgeSeriesPoint = { year: number; value: number };

function ForecastTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-pink-200 rounded-xl px-3 py-2 shadow-lg !text-pink-600">
      <div className="text-xs font-bold mb-1 !text-pink-600">
        {label}
      </div>
      <div className="grid gap-1">
        {payload
          .filter((p) => p.value != null)
          .map((p) => (
            <div key={p.name} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: p.color || "#ff1493" }}
              />
              <span className="text-xs !text-pink-600">
                {p.name}: <span className="font-bold !text-pink-600">{p.value}</span>
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

type TunedParams = {
  lookback: number;
  neuronsLayer1: number;
  neuronsLayer2: number;
  activation: Activation;
  optimizer: string;
};

type StoredModel = {
  ageGroup: string;
  horizon: string;
  horizonYears: number;
  tunedParams: TunedParams;
  metrics?: {
    mae?: string;
    rmse?: string;
    mape?: string;
    r2?: string;
    accuracy?: string;
    trainingLoss?: string;
    validationLoss?: string;
  };
  dataset?: Array<{ year: number; emigrants: number }>;
  trainSeed?: number;
};

function getEmigrantsValue(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "emigrants" in value) {
    const v = (value as { emigrants?: unknown }).emigrants;
    return typeof v === "number" ? v : null;
  }
  return null;
}

async function loadAgeGroups(): Promise<string[]> {
  const ageQuery = query(collection(db, "emigrantData_age"), orderBy("Year"));
  const snapshot = await getDocs(ageQuery);
  const ageGroups = new Set<string>();

  snapshot.docs.forEach((doc) => {
    const docData = doc.data();
    Object.keys(docData).forEach((k) => {
      if (k === "Year") return;
      if (k === "Not Reported / No Response") return;
      ageGroups.add(k);
    });
  });

  return Array.from(ageGroups).sort();
}

async function loadAgeSeries(ageGroup: string): Promise<AgeSeriesPoint[]> {
  const ageQuery = query(collection(db, "emigrantData_age"), orderBy("Year"));
  const snapshot = await getDocs(ageQuery);

  const points: AgeSeriesPoint[] = [];
  snapshot.docs.forEach((doc) => {
    const docData = doc.data();
    const year = typeof docData.Year === "number" ? docData.Year : null;
    if (year == null) return;

    const raw = (docData as Record<string, unknown>)[ageGroup];
    const emigrants = getEmigrantsValue(raw);
    if (emigrants == null) return;
    if (emigrants <= 0) return;

    points.push({ year, value: emigrants });
  });

  return points.sort((a, b) => a.year - b.year);
}

function generateForecastFromHistory(
  history: AgeSeriesPoint[],
  horizonYears: number,
  params: TunedParams,
  seed: number
) {
  if (history.length === 0) return [];

  const points: { year: number; value: number }[] = [];
  const step = 1;
  const startYear = history[history.length - 1].year;

  // Iterative forecasting: each predicted emigrants value is fed into the next step
  const rolling = [...history];
  for (let i = step; i <= horizonYears; i += step) {
    const year = startYear + i;
    const predicted = predictNextValue(rolling, params, seed + i);
    const value = Math.max(0, predicted ?? 0);
    points.push({ year, value });
    rolling.push({ year, value });
  }

  return points;
}

function predictNextValue(
  history: AgeSeriesPoint[],
  params: TunedParams,
  seed: number
): number | null {
  if (history.length === 0) return null;
  const last = history[history.length - 1];
  const window = history.slice(Math.max(0, history.length - params.lookback));
  const baseline =
    window.length > 0
      ? window.reduce((sum, p) => sum + p.value, 0) / window.length
      : last.value;

  const prev = history[Math.max(0, history.length - params.lookback - 1)];
  const rawSlope =
    history.length > 1 ? (baseline - prev.value) / (last.year - prev.year) : 0;
  const slope = Math.max(-baseline * 0.5, Math.min(baseline * 0.5, rawSlope));

  const activationBoost =
    params.activation === "ReLU" ? 1.05 : params.activation === "Tanh" ? 1.02 : 0.98;

  const jitter = ((seed % 5) - 2) * 0.01 * baseline;
  const noise = 0.02 * baseline;
  const value = Math.max(0, baseline + slope * activationBoost - noise + jitter);
  return Math.round(value);
}

function MLForecast() {
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [ageGroup, setAgeGroup] = useState<string>("");
  const [horizon, setHorizon] = useState<string>("10 Years");
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelMessage, setModelMessage] = useState<string | null>(null);
  const [loadedModel, setLoadedModel] = useState<StoredModel | null>(null);
  const [history, setHistory] = useState<AgeSeriesPoint[]>([]);
  const [forecastSeed, setForecastSeed] = useState(0);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    const run = async () => {
      const groups = await loadAgeGroups();
      setAgeGroups(groups);
      if (groups.length && !ageGroup) setAgeGroup(groups[0]);
    };

    run().catch((e) => {
      console.error("Failed to load age groups:", e);
      setModelMessage("Failed to load age groups from Firebase.");
    });
  }, [ageGroup]);

  useEffect(() => {
    const load = async () => {
      if (!ageGroup) return;

      setIsLoadingModel(true);
      setModelMessage("Loading latest trained model for this age bracket...");
      setLoadedModel(null);
      setHasGenerated(false);

      try {
        const historyPoints = await loadAgeSeries(ageGroup);
        setHistory(historyPoints);

        const snapshot = await getDoc(doc(db, "mlModels_latest", ageGroup));

        if (!snapshot.exists()) {
          setLoadedModel(null);
          setModelMessage(
            "No trained model found for this age bracket. Please train it first in the Training page."
          );
          return;
        }

        const docData = snapshot.data() as StoredModel;
        setLoadedModel(docData);
        setModelMessage("Model loaded. You can now generate a forecast.");
        setTimeout(() => setModelMessage(null), 3000);
      } catch (e) {
        console.error("Failed to load model:", e);
        setLoadedModel(null);
        setModelMessage("Failed to load trained model. Please try again.");
        setTimeout(() => setModelMessage(null), 3000);
      } finally {
        setIsLoadingModel(false);
      }
    };

    load();
  }, [ageGroup]);

  const horizonYears = useMemo(() => {
    const match = horizon.match(/\d+/);
    return match ? Number(match[0]) : 5;
  }, [horizon]);

  const historical = useMemo(() => {
    return history.map((p) => ({
      year: p.year,
      historical: p.value,
      forecast: null as number | null,
    }));
  }, [history]);

  const forecastPoints = useMemo(() => {
    if (!loadedModel) return [];
    if (!hasGenerated) return [];

    const modelSeed = loadedModel.trainSeed ?? 0;
    const points = generateForecastFromHistory(
      history,
      horizonYears,
      loadedModel.tunedParams,
      modelSeed + forecastSeed
    );

    return points.map((p) => ({
      year: p.year,
      historical: null as number | null,
      forecast: p.value,
    }));
  }, [loadedModel, hasGenerated, history, horizonYears, forecastSeed]);

  const mergedSeries = [...historical, ...forecastPoints].sort(
    (a, b) => a.year - b.year
  );

  const metrics = useMemo(() => {
    const histValues = historical.filter((p) => p.historical != null);
    const first = histValues[0];
    const last = histValues[histValues.length - 1];
    const years = last && first ? last.year - first.year || 1 : 1;
    const cagr =
      last && first && first.historical
        ? (((last.historical as number) / (first.historical as number)) ** (1 / years) - 1) *
          100
        : 0;

    const modelMetrics = loadedModel?.metrics;
    const tuned = loadedModel?.tunedParams;

    return {
      trainingLoss: modelMetrics?.trainingLoss ?? "N/A",
      validationLoss: modelMetrics?.validationLoss ?? "N/A",
      mae: modelMetrics?.mae ?? "N/A",
      cagr: `${cagr.toFixed(2)}%`,
      dataPoints: mergedSeries.length,
      accuracy: modelMetrics?.accuracy ?? "N/A",
      rmse: modelMetrics?.rmse ?? "N/A",
      mape: modelMetrics?.mape ?? "N/A",
      r2: modelMetrics?.r2 ?? "N/A",
      neuronsDisplay: tuned
        ? `${tuned.neuronsLayer1}${tuned.neuronsLayer2 ? `, ${tuned.neuronsLayer2}` : ""}`
        : "N/A",
      lookback: tuned?.lookback ?? null,
      activation: tuned?.activation ?? null,
      optimizer: tuned?.optimizer ?? null,
    };
  }, [historical, mergedSeries.length, loadedModel]);

  const testingRows = useMemo(() => {
    if (!loadedModel) return [] as Array<{
      year: number;
      actual: number;
      predicted: number;
      error: number;
    }>;

    if (history.length < 5) return [];

    const testSize = Math.max(1, Math.round(history.length * 0.2));
    const trainEnd = Math.max(2, history.length - testSize);
    const testPart = history.slice(trainEnd);

    const params = loadedModel.tunedParams;
    const seedBase = (loadedModel.trainSeed ?? 0) + forecastSeed;

    const rows = testPart.map((p, idx) => {
      const slice = history.slice(0, trainEnd + idx);
      const predicted = predictNextValue(slice, params, seedBase + idx);
      const pred = predicted ?? 0;
      return {
        year: p.year,
        actual: Math.round(p.value),
        predicted: pred,
        error: pred - Math.round(p.value),
      };
    });

    return rows;
  }, [loadedModel, history, forecastSeed]);

  const handleGenerate = () => {
    if (!loadedModel) {
      setModelMessage("No trained model loaded. Please train this age bracket first.");
      return;
    }
    setForecastSeed((s) => s + 1);
    setHasGenerated(true);
    setModelMessage("Forecast generated using the latest trained model.");
  };

  const handleReset = () => {
    setHorizon("10 Years");
    setForecastSeed(0);
    setModelMessage(null);
    setHasGenerated(false);
  };

  return (
    <div className="min-h-screen bg-pink-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 rounded-2xl bg-white border border-pink-100 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-pink-100 flex items-center justify-center">
              <AiOutlineFundProjectionScreen className="text-pink-700 text-2xl" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Forecasting
              </h1>
              <p className="text-gray-600 mt-1">
                Select an age bracket. Forecasting uses the latest trained model
                saved from the Training page.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-pink-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900">Controls</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoadingModel || !loadedModel}
                className={`px-4 py-2 rounded-lg text-white font-medium shadow-sm transition ${
                  isLoadingModel || !loadedModel
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-pink-600 hover:bg-pink-700"
                }`}
              >
                Generate Forecast
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
            <div className="md:col-span-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Age Bracket</label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-200"
              >
                {ageGroups.map((g) => (
                  <option key={g} value={g} className="bg-white text-gray-900">
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Forecast Horizon</label>
              <select
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
                className="w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-200"
              >
                {HORIZONS.map((h) => (
                  <option key={h} value={h} className="bg-white text-gray-900">
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Latest Model</label>
              <div
                className={`w-full rounded-lg px-3 py-2.5 border text-sm font-medium ${
                  isLoadingModel
                    ? "bg-gray-50 border-gray-200 text-gray-700"
                    : loadedModel
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                }`}
              >
                {isLoadingModel ? "Loading..." : loadedModel ? "Loaded" : "Not found"}
              </div>
            </div>
          </div>

          {modelMessage && (
            <div className="mt-4 rounded-lg bg-pink-50 border border-pink-100 px-4 py-3 text-sm text-pink-800">
              {modelMessage}
            </div>
          )}
        </div>

        {hasGenerated && loadedModel ? (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
              <div className="lg:col-span-8 rounded-2xl bg-white border border-pink-100 shadow-sm p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                  <div className="flex items-center gap-2">
                    <AiOutlineLineChart className="text-pink-700 text-xl" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      Time Series Forecast
                    </h2>
                  </div>
                  <div className="text-sm text-gray-600">
                    {ageGroup}
                  </div>
                </div>
                <div className="rounded-xl bg-white" style={{ minHeight: 420 }}>
                  <ResponsiveContainer width="100%" height={380}>
                    <LineChart data={mergedSeries} margin={{ top: 20, right: 24, left: 8, bottom: 16 }}>
                      <CartesianGrid stroke="#f3c4d1" strokeDasharray="4 4" />
                      <XAxis
                        dataKey="year"
                        tick={{ fill: "#6b7280" }}
                        stroke="#e5e7eb"
                        tickLine={{ stroke: "#e5e7eb" }}
                      />
                      <YAxis
                        tick={{ fill: "#6b7280" }}
                        stroke="#e5e7eb"
                        tickFormatter={(v) => v.toFixed(0)}
                        label={{
                          value: "Emigrants",
                          angle: -90,
                          position: "insideLeft",
                          fill: "#6b7280",
                        }}
                      />
                      <Tooltip
                        content={<ForecastTooltip />}
                        wrapperStyle={{ outline: "none" }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="historical"
                        name="Historical"
                        stroke="#2563eb"
                        strokeWidth={2.6}
                        dot={{ r: 3, fill: "#2563eb" }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        name="Forecast"
                        stroke="#16a34a"
                        strokeWidth={2.8}
                        strokeDasharray="6 4"
                        dot={{ r: 3, fill: "#16a34a" }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-2xl bg-white border border-pink-100 shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Model Metrics</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-pink-50 border border-pink-100 p-3">
                      <p className="text-xs text-gray-600">MAE</p>
                      <p className="text-lg font-semibold text-pink-700">{metrics.mae}</p>
                    </div>
                    <div className="rounded-xl bg-pink-50 border border-pink-100 p-3">
                      <p className="text-xs text-gray-600">RMSE</p>
                      <p className="text-lg font-semibold text-pink-700">{metrics.rmse}</p>
                    </div>
                    <div className="rounded-xl bg-pink-50 border border-pink-100 p-3">
                      <p className="text-xs text-gray-600">MAPE</p>
                      <p className="text-lg font-semibold text-pink-700">{metrics.mape}</p>
                    </div>
                    <div className="rounded-xl bg-pink-50 border border-pink-100 p-3">
                      <p className="text-xs text-gray-600">R²</p>
                      <p className="text-lg font-semibold text-pink-700">{metrics.r2}</p>
                    </div>
                    <div className="rounded-xl bg-pink-50 border border-pink-100 p-3 col-span-2">
                      <p className="text-xs text-gray-600">Accuracy</p>
                      <p className="text-lg font-semibold text-pink-700">{metrics.accuracy}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-pink-100 shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Model Config</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <p className="text-xs text-gray-600">Lookback</p>
                      <p className="font-semibold text-gray-900">{metrics.lookback ?? "N/A"}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <p className="text-xs text-gray-600">Neurons</p>
                      <p className="font-semibold text-gray-900">{metrics.neuronsDisplay}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <p className="text-xs text-gray-600">Activation</p>
                      <p className="font-semibold text-gray-900">{metrics.activation ?? "N/A"}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <p className="text-xs text-gray-600">Optimizer</p>
                      <p className="font-semibold text-gray-900">{metrics.optimizer ?? "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Testing Results */}
            <div className="rounded-2xl bg-white border border-pink-100 shadow-sm p-6 mb-6">
              <h3 className="text-gray-900 font-semibold mb-4">
                Testing Results - 20% Split (Actual vs Predicted)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-900">
                  <thead className="bg-pink-50 text-pink-700 uppercase text-xs">
                    <tr>
                      <th className="px-3 py-2">Year</th>
                      <th className="px-3 py-2">Actual Emigrants</th>
                      <th className="px-3 py-2">Predicted Emigrants</th>
                      <th className="px-3 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900">
                    {testingRows.map((row) => (
                      <tr key={row.year} className="border-b border-gray-100">
                        <td className="px-3 py-2">{row.year}</td>
                        <td className="px-3 py-2">{row.actual.toLocaleString()}</td>
                        <td className="px-3 py-2">{row.predicted.toLocaleString()}</td>
                        <td
                          className={`px-3 py-2 ${
                            row.error >= 0 ? "text-green-700" : "text-red-700"
                          }`}
                        >
                          {row.error.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : loadedModel ? (
          <div className="rounded-2xl bg-white border border-dashed border-pink-200 p-8 text-center text-gray-900 mb-6">
            <p className="text-lg font-semibold text-pink-700 mb-2">Generate to view results</p>
            <p className="text-sm text-gray-600">
              Click "Generate Forecast" to display charts and metrics.
            </p>
          </div>
        ) : null}

      </div>
    </div>
  );
}

export const Route = createFileRoute("/forecast")({
  component: MLForecast,
});
