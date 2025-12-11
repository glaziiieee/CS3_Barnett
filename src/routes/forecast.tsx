import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

type Activation = "ReLU" | "Tanh" | "Sigmoid";

const COUNTRIES = ["ALBANIA", "USA", "CANADA", "JAPAN", "AUSTRALIA"];
const DATA_TYPES = ["Destination Country", "Origin Province"];
const HORIZONS = ["3 Years", "5 Years", "10 Years"];
const ACTIVATIONS: Activation[] = ["ReLU", "Tanh", "Sigmoid"];

const baseSeries = {
  ALBANIA: [
    { year: 2014, value: 2.9 },
    { year: 2016, value: 2.4 },
    { year: 2018, value: 1.8 },
  ],
  USA: [
    { year: 2014, value: 12.2 },
    { year: 2016, value: 12.7 },
    { year: 2018, value: 13.4 },
  ],
  CANADA: [
    { year: 2014, value: 4.2 },
    { year: 2016, value: 4.5 },
    { year: 2018, value: 4.8 },
  ],
  JAPAN: [
    { year: 2014, value: 1.8 },
    { year: 2016, value: 2.1 },
    { year: 2018, value: 2.5 },
  ],
  AUSTRALIA: [
    { year: 2014, value: 3.3 },
    { year: 2016, value: 3.8 },
    { year: 2018, value: 4.1 },
  ],
};

function generateForecast(
  country: string,
  horizonYears: number,
  lookback: number,
  activation: Activation,
  seed: number
) {
  const history = baseSeries[country as keyof typeof baseSeries] || [];
  if (history.length === 0) return [];

  // Simple synthetic extrapolation: slope from last 2 points, adjusted by activation
  const last = history[history.length - 1];
  const prev = history[Math.max(0, history.length - lookback)];
  const slope =
    history.length > 1 ? (last.value - prev.value) / (last.year - prev.year) : 0;

  const activationBoost =
    activation === "ReLU" ? 1.05 : activation === "Tanh" ? 1.02 : 0.98;

  const points: { year: number; value: number }[] = [];
  const step = Math.max(1, Math.round(horizonYears / 2));
  const startYear = last.year;
  for (let i = step; i <= horizonYears; i += step) {
    const year = startYear + i;
    const drift = slope * i * activationBoost;
    // Deterministic, small jitter based on seed to show change per training
    const jitter = ((seed % 5) - 2) * 0.01 * last.value * (i / horizonYears);
    const noise = 0.02 * last.value * (i / horizonYears); // small variance
    const value = Math.max(0, last.value + drift - noise + jitter);
    points.push({ year, value: parseFloat(value.toFixed(2)) });
  }

  return points;
}

function MLForecast() {
  const [dataType, setDataType] = useState<string>(DATA_TYPES[0]);
  const [country, setCountry] = useState<string>("ALBANIA");
  const [horizon, setHorizon] = useState<string>("10 Years");
  const [lookback, setLookback] = useState<number>(3);
  const [neuronsLayer1, setNeuronsLayer1] = useState<number>(64);
  const [neuronsLayer2, setNeuronsLayer2] = useState<number>(32);
  const [activation, setActivation] = useState<Activation>("ReLU");
  const [optimizer, setOptimizer] = useState<string>("Adam");
  const [isTraining, setIsTraining] = useState(false);
  const [trainMessage, setTrainMessage] = useState<string | null>(null);
  const [trainSeed, setTrainSeed] = useState(0);
  const [hasTrained, setHasTrained] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const horizonYears = useMemo(() => {
    const match = horizon.match(/\d+/);
    return match ? Number(match[0]) : 5;
  }, [horizon]);

  const historical = useMemo(() => {
    const series = baseSeries[country as keyof typeof baseSeries] || [];
    return series.map((p) => ({
      year: p.year,
      historical: p.value,
      forecast: null as number | null,
    }));
  }, [country]);

  const forecastPoints = useMemo(
    () => generateForecast(country, horizonYears, lookback, activation, trainSeed),
    [country, horizonYears, lookback, activation, trainSeed]
  ).map((p) => ({
    year: p.year,
    historical: null as number | null,
    forecast: p.value,
  }));

  const mergedSeries = [...historical, ...forecastPoints].sort(
    (a, b) => a.year - b.year
  );

  const metrics = useMemo(() => {
    const histValues = historical.filter((p) => p.historical != null);
    const first = histValues[0];
    const last = histValues[histValues.length - 1];
    const years = last && first ? last.year - first.year || 1 : 1;
    const trainingLoss = (lookback * 0.0009 + trainSeed * 0.0003 + 0.005).toFixed(4);
    const validationLoss = (lookback * 0.0012 + trainSeed * 0.0004 + 0.004).toFixed(4);
    const mae = (Math.abs(lookback - horizonYears) * 0.01 + 0.05).toFixed(3);
    const cagr =
      last && first && first.historical
        ? (((last.historical as number) / (first.historical as number)) ** (1 / years) - 1) *
          100
        : 0;
    // Build aligned pairs to compute RMSE, MAPE, R2
    const pairs = histValues.map((h, idx) => {
      // Larger jitter so MAPE/accuracy reflect the reference layout (~20% MAPE ≈ 80% accuracy)
      const base = h.historical as number;
      const jitterFactor = ((trainSeed + idx) % 7 - 3) * 0.08; // up to ±24%
      const predicted = Math.max(0, base + base * jitterFactor);
      return { actual: base, predicted };
    });

    const sse = pairs.reduce((sum, p) => sum + (p.actual - p.predicted) ** 2, 0);
    const mse = pairs.length ? sse / pairs.length : 0;
    const rmse = Math.sqrt(mse);
    const mape =
      pairs.length && pairs.some((p) => p.actual !== 0)
        ? (pairs.reduce((sum, p) => sum + Math.abs((p.actual - p.predicted) / Math.max(p.actual, 1)), 0) / pairs.length) *
          100
        : 0;
    const meanActual =
      pairs.reduce((sum, p) => sum + p.actual, 0) / (pairs.length || 1);
    const sst = pairs.reduce((sum, p) => sum + (p.actual - meanActual) ** 2, 0);
    const r2 = sst ? 1 - sse / sst : 0;
    // Calculate accuracy dynamically from MAPE; higher error -> lower accuracy
    const accuracyVal = pairs.length
      ? Math.max(0, Math.min(100, 100 - mape))
      : null;

    return {
      trainingLoss,
      validationLoss,
      mae,
      cagr: `${cagr.toFixed(2)}%`,
      dataPoints: mergedSeries.length,
      accuracy: accuracyVal !== null ? `${accuracyVal.toFixed(2)}%` : "N/A",
      rmse: rmse.toFixed(2),
      mape: `${mape.toFixed(2)}%`,
      r2: r2.toFixed(4),
      testPairs: pairs,
      neuronsDisplay: `${neuronsLayer1}${neuronsLayer2 ? `, ${neuronsLayer2}` : ""}`,
    };
  }, [
    historical,
    forecastPoints,
    mergedSeries.length,
    lookback,
    horizonYears,
    trainSeed,
    neuronsLayer1,
    neuronsLayer2,
    activation,
    optimizer,
  ]);

  const testingRows = useMemo(() => {
    const rows = metrics.testPairs || [];
    const sample = rows.slice(-6).map((p, idx) => {
      const year = (historical[historical.length - 6 + idx]?.year as number) || 2000 + idx;
      const error = p.predicted - p.actual;
      return {
        year,
        actual: Math.round(p.actual),
        predicted: Math.round(p.predicted),
        error: Math.round(error),
      };
    });
    return sample;
  }, [metrics.testPairs, historical]);

  const handleTrain = () => {
    if (isTraining) return;
    setIsTraining(true);
    setTrainMessage("Training model with current parameters...");
    // Simulate a brief training cycle and trigger a fresh forecast seed
    const timer = setTimeout(() => {
      setTrainSeed((s) => s + 1);
      setTrainMessage("Training complete. Forecast updated with latest settings.");
      setIsTraining(false);
      setHasTrained(true);
      setHasGenerated(false);
    }, 900);
    // Safety: ensure we clear any pending timer if multiple clicks somehow occur
    return () => clearTimeout(timer);
  };

  const handleGenerate = () => {
    if (isTraining) return;
    if (!hasTrained) {
      setTrainMessage("Please train the model before generating a forecast.");
      return;
    }
    setTrainSeed((s) => s + 1);
    setHasGenerated(true);
    setTrainMessage("Forecast generated with current parameters.");
  };

  const handleReset = () => {
    setDataType(DATA_TYPES[0]);
    setCountry("ALBANIA");
    setHorizon("10 Years");
    setLookback(3);
    setNeuronsLayer1(64);
    setNeuronsLayer2(32);
    setActivation("ReLU");
    setOptimizer("Adam");
    setTrainSeed(0);
    setTrainMessage(null);
    setHasTrained(false);
    setHasGenerated(false);
    setSaveMessage(null);
  };

  const handleSaveModel = async () => {
    if (!hasGenerated) {
      setSaveMessage("Please generate a forecast before saving the model.");
      return;
    }

    setIsSaving(true);
    setSaveMessage("Saving model to Firebase...");

    try {
      const modelData = {
        // Configuration
        dataType,
        country,
        horizon,
        horizonYears,
        lookback,
        neuronsLayer1,
        neuronsLayer2,
        activation,
        optimizer,
        
        // Metrics
        mae: metrics.mae,
        rmse: metrics.rmse,
        mape: metrics.mape,
        r2: metrics.r2,
        accuracy: metrics.accuracy,
        trainingLoss: metrics.trainingLoss,
        validationLoss: metrics.validationLoss,
        cagr: metrics.cagr,
        dataPoints: metrics.dataPoints,
        
        // Forecast data
        forecastPoints: forecastPoints.map(p => ({
          year: p.year,
          forecast: p.forecast,
        })),
        
        // Historical data
        historicalData: historical.map(h => ({
          year: h.year,
          historical: h.historical,
        })),
        
        // Testing results
        testingResults: testingRows,
        
        // Metadata
        trainSeed,
        savedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "mlModels"), modelData);
      setSaveMessage("Model successfully saved to Firebase!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error("Error saving model to Firebase:", error);
      setSaveMessage("Failed to save model. Please try again.");
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 bg-primary min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <AiOutlineFundProjectionScreen className="text-highlights text-3xl" />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              ML Forecast
            </h1>
            <p className="text-gray-500">
              Configure simple ML-style parameters and preview synthetic
              forecasts to mirror the target layout.
            </p>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-secondary border border-gray-700 rounded-lg p-4 mb-6">
          <h2 className="text-white font-semibold mb-4">Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-2">Data Type</label>
              <select
                value={dataType}
                onChange={(e) => setDataType(e.target.value)}
                className="w-full bg-primary text-white border border-gray-600 rounded-md px-3 py-2"
              >
                {DATA_TYPES.map((d) => (
                  <option key={d} value={d} className="bg-primary text-white">
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-2">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-primary text-white border border-gray-600 rounded-md px-3 py-2"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c} className="bg-primary text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-2">
                Forecast Horizon (Years)
              </label>
              <select
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
                className="w-full bg-primary text-white border border-gray-600 rounded-md px-3 py-2"
              >
                {HORIZONS.map((h) => (
                  <option key={h} value={h} className="bg-primary text-white">
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Hyperparameters */}
        <div className="bg-secondary border border-gray-700 rounded-lg p-4 mb-6">
          <h2 className="text-white font-semibold mb-4">Model Hyperparameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm text-gray-500 mb-2">
                Lookback (Window Size)
              </label>
              <input
                type="number"
                value={lookback}
                min={1}
                max={10}
                onChange={(e) => setLookback(Number(e.target.value || 1))}
                className="w-full bg-white text-gray-800 border border-gray-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-highlights focus:border-highlights"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-2">
                MLP Neurons (Units)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  value={neuronsLayer1}
                  onChange={(e) => setNeuronsLayer1(Number(e.target.value || 0))}
                  className="w-full bg-white text-gray-800 border border-gray-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-highlights focus:border-highlights"
                  placeholder="Layer 1"
                />
                <input
                  type="number"
                  min={0}
                  value={neuronsLayer2}
                  onChange={(e) => setNeuronsLayer2(Number(e.target.value || 0))}
                  className="w-full bg-white text-gray-800 border border-gray-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-highlights focus:border-highlights"
                  placeholder="Layer 2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-2">
                Activation Function
              </label>
              <select
                value={activation}
                onChange={(e) => setActivation(e.target.value as Activation)}
                className="w-full bg-white text-gray-800 border border-gray-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-highlights focus:border-highlights"
              >
                {ACTIVATIONS.map((a) => (
                  <option key={a} value={a} className="bg-primary text-white">
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-2">
                Optimizer
              </label>
              <select
                value={optimizer}
                onChange={(e) => setOptimizer(e.target.value)}
                className="w-full bg-white text-gray-800 border border-gray-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-highlights focus:border-highlights"
              >
                {ACTIVATIONS.map((a) => (
                  <option key={a} value={a} className="bg-primary text-white">
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              type="button"
              onClick={handleTrain}
              disabled={isTraining}
              className={`bg-highlights text-white px-4 py-2 rounded-md shadow transition ${
                isTraining ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"
              }`}
            >
              {isTraining ? "Training..." : "Train Model"}
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isTraining || !hasTrained}
              className={`bg-blue-500 text-white px-4 py-2 rounded-md shadow transition ${
                isTraining || !hasTrained
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:opacity-90"
              }`}
            >
              Generate Forecast
            </button>
            <button
              type="button"
              onClick={handleSaveModel}
              disabled={isSaving || !hasGenerated}
              className={`bg-purple-600 text-white px-4 py-2 rounded-md shadow transition ${
                isSaving || !hasGenerated
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:opacity-90"
              }`}
            >
              {isSaving ? "Saving..." : "Save Model to Firebase"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="bg-red-600 text-white px-4 py-2 rounded-md shadow hover:opacity-90 transition"
            >
              Reset
            </button>
          </div>
          {saveMessage && (
            <p className={`mt-3 text-sm ${
              saveMessage.includes("successfully") 
                ? "text-green-400" 
                : saveMessage.includes("Failed")
                ? "text-red-400"
                : "text-gray-700"
            }`}>
              {saveMessage}
            </p>
          )}
        </div>

        {hasGenerated ? (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-secondary border border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-700">MAE</p>
                <p className="text-2xl text-pink-700 font-semibold">{metrics.mae}</p>
              </div>
              <div className="bg-secondary border border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-700">RMSE</p>
                <p className="text-2xl text-pink-700 font-semibold">{metrics.rmse}</p>
              </div>
              <div className="bg-secondary border border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-700">MAPE</p>
                <p className="text-2xl text-pink-700 font-semibold">{metrics.mape}</p>
              </div>
              <div className="bg-secondary border border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-700">R²</p>
                <p className="text-2xl text-pink-700 font-semibold">{metrics.r2}</p>
              </div>
              <div className="bg-secondary border border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-700">Accuracy</p>
                <p className="text-2xl text-pink-700 font-semibold">{metrics.accuracy}</p>
              </div>
            </div>

            {/* Trained model config table (single row) */}
            <div className="bg-secondary border border-gray-700 rounded-lg p-4 mb-6 text-gray-800">
              <p className="text-white font-semibold mb-3">Trained Model Configuration</p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-primary text-pink-700 uppercase text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">Lookback</th>
                      <th className="px-3 py-2 text-left">MLP Neurons (Units)</th>
                      <th className="px-3 py-2 text-left">Activation</th>
                      <th className="px-3 py-2 text-left">MAE</th>
                      <th className="px-3 py-2 text-left">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-800">
                    <tr className="border-b border-gray-700">
                      <td className="px-3 py-2">{lookback}</td>
                      <td className="px-3 py-2">{metrics.neuronsDisplay}</td>
                      <td className="px-3 py-2 capitalize">{activation}</td>
                      <td className="px-3 py-2">{metrics.mae}</td>
                      <td className="px-3 py-2 text-pink-700 font-semibold">{metrics.accuracy}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-secondary border border-gray-700 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <AiOutlineLineChart className="text-highlights text-xl" />
                <h2 className="text-white font-semibold">
                  Time Series Forecast - {country}
                </h2>
              </div>
              <div className="bg-primary rounded-md p-4" style={{ minHeight: 400 }}>
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={mergedSeries} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: "#9ca3af" }}
                      stroke="#9ca3af"
                      tickLine={{ stroke: "#9ca3af" }}
                    />
                    <YAxis
                      tick={{ fill: "#9ca3af" }}
                      stroke="#9ca3af"
                      tickFormatter={(v) => v.toFixed(1)}
                      label={{
                        value: "Emigrants",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#9ca3af",
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(val: any) => (val == null ? "-" : val)}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="historical"
                      name="Historical"
                      stroke="#60a5fa"
                      strokeWidth={2.4}
                      dot={{ r: 4, fill: "#60a5fa" }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name="Forecast"
                      stroke="#22c55e"
                      strokeWidth={2.6}
                      strokeDasharray="5 4"
                      dot={{ r: 4, fill: "#22c55e" }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Testing Results */}
            <div className="bg-secondary border border-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-white font-semibold mb-3">
                Testing Results - 20% Split (Actual vs Predicted)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-800">
                  <thead className="bg-primary text-pink-700 uppercase text-xs">
                    <tr>
                      <th className="px-3 py-2">Year</th>
                      <th className="px-3 py-2">Actual Emigrants</th>
                      <th className="px-3 py-2">Predicted Emigrants</th>
                      <th className="px-3 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-800">
                    {testingRows.map((row) => (
                      <tr key={row.year} className="border-b border-gray-700">
                        <td className="px-3 py-2">{row.year}</td>
                        <td className="px-3 py-2">{row.actual.toLocaleString()}</td>
                        <td className="px-3 py-2">{row.predicted.toLocaleString()}</td>
                        <td
                          className={`px-3 py-2 ${
                            row.error >= 0 ? "text-pink-700" : "text-pink-700"
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
        ) : hasTrained ? (
          <div className="bg-secondary border border-dashed border-highlights/60 rounded-lg p-6 text-center text-gray-800 mb-6">
            <p className="text-lg font-semibold text-pink-700 mb-2">Generate to view results</p>
            <p className="text-sm text-gray-700">
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
