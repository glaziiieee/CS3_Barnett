import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  AiOutlineGlobal,
  AiOutlineBarChart,
  AiOutlineLineChart,
  AiOutlineStar,
} from "react-icons/ai";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useTrendData } from "../hooks/useTrendData";
import { useComparisonData } from "../hooks/useComparisonData";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export const Route = createFileRoute("/")({
  component: Index,
});

// Calendar component
function Calendar() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const days = useMemo(() => {
    const daysArray: (number | null)[] = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      daysArray.push(null);
    }
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      daysArray.push(i);
    }
    return daysArray;
  }, [firstDayOfMonth, daysInMonth]);

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="bg-white rounded-lg p-4">
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map((day, idx) => (
          <div key={idx} className="text-xs font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          const isHighlighted = day === 3 || day === 12 || day === 25;
          const isBlue = day === 3 || day === 12;
          const isOrange = day === 25;

          return (
            <div
              key={idx}
              className={`text-sm py-2 ${
                day === null
                  ? "text-transparent"
                  : isHighlighted
                  ? isBlue
                    ? "bg-blue-200 text-gray-800 rounded"
                    : isOrange
                    ? "bg-orange-200 text-gray-800 rounded"
                    : "text-gray-800"
                  : "text-gray-400"
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Index() {
  const stats = useDashboardStats();
  const { countryTrends } = useTrendData();
  const { data: comparisonData } = useComparisonData();
  const [yearlyData, setYearlyData] = useState<Array<{ year: number; total: number }>>([]);

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
        
        const sortedData = Array.from(yearTotals.entries())
          .sort(([a], [b]) => a - b)
          .map(([year, total]) => ({ year, total }));
        
        setYearlyData(sortedData);
      } catch (error) {
        console.error("Error fetching yearly data:", error);
      }
    };
    
    fetchYearlyData();
  }, []);

  // Prepare bar chart data (comparing two most recent years)
  const barChartData = useMemo(() => {
    if (yearlyData.length < 2) return [];
    const lastTwoYears = yearlyData.slice(-2);
    const year1 = lastTwoYears[0]?.year;
    const year2 = lastTwoYears[1]?.year;
    
    // Get data for the last 9 years to show trend
    const recentYears = yearlyData.slice(-9);
    
    return recentYears.map((item) => ({
      year: item.year.toString().slice(-2),
      [`${year1}`]: item.year === year1 ? item.total : 0,
      [`${year2}`]: item.year === year2 ? item.total : 0,
    }));
  }, [yearlyData]);

  // Prepare donut chart data (top destinations)
  const donutData = useMemo(() => {
    const topCountries = comparisonData.slice(0, 5);
    const total = topCountries.reduce((sum, item) => sum + item.emigrants, 0);
    const others = comparisonData.slice(5).reduce((sum, item) => sum + item.emigrants, 0);
    
    const data = topCountries.map((item) => ({
      name: item.country,
      value: Math.round((item.emigrants / (total + others)) * 100),
      emigrants: item.emigrants,
    }));
    
    if (others > 0) {
      data.push({
        name: "Others",
        value: Math.round((others / (total + others)) * 100),
        emigrants: others,
      });
    }
    
    return data;
  }, [comparisonData]);

  // Pastel color scheme: Pink, Light Blue, Lavender, Mint Green, Peach, Soft Blue
  const donutColors = ["#F8BBD0", "#A8D5E2", "#E1BEE7", "#B2DFDB", "#FFCCBC", "#B3E5FC"];

  // Prepare area chart data (trends over time)
  const areaChartData = useMemo(() => {
    if (countryTrends.length === 0) return [];
    
    const topCountry = countryTrends[0];
    const secondCountry = countryTrends[1] || countryTrends[0];
    
    const maxLength = Math.max(topCountry.data.length, secondCountry.data.length);
    const data: Array<{ year: string; value1: number; value2: number }> = [];
    
    for (let i = 0; i < maxLength; i++) {
      const year1 = topCountry.data[i]?.x || "";
      const year2 = secondCountry.data[i]?.x || "";
      const value1 = topCountry.data[i]?.y || 0;
      const value2 = secondCountry.data[i]?.y || 0;
      
      if (year1) {
        data.push({
          year: year1.slice(-2),
          value1,
          value2,
        });
      }
    }
    
    return data.slice(-9);
  }, [countryTrends]);

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
              <h3 className="text-sm font-medium">Total Emigrants</h3>
              <div className="bg-blue-100 rounded-full p-2">
                <AiOutlineGlobal className="text-xl text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{stats.totalEmigrants}M</p>
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
              <h3 className="text-lg font-semibold text-gray-800">Yearly Emigration Trends</h3>
              <button className="bg-orange-200 text-gray-800 px-4 py-2 rounded-md text-sm hover:bg-orange-300 transition">
                View Details
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData.length > 0 ? barChartData : []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="year" stroke="#6b7280" />
                <YAxis stroke="#6b7280" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: number) => `${(value / 1000000).toFixed(2)}M`}
                />
                <Legend />
                {yearlyData.length >= 2 && (
                  <>
                    <Bar 
                      dataKey={`${yearlyData[yearlyData.length - 2]?.year}`}
                      fill="#FFCCBC" 
                      name={`${yearlyData[yearlyData.length - 2]?.year}`}
                    />
                    <Bar 
                      dataKey={`${yearlyData[yearlyData.length - 1]?.year}`}
                      fill="#B3E5FC" 
                      name={`${yearlyData[yearlyData.length - 1]?.year}`}
                    />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Donut Chart - Takes 1 column */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Destinations</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={donutData.length > 0 ? donutData : [{ name: "No Data", value: 100 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={donutColors[index % donutColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `${value}%`}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-4">
              <p className="text-2xl font-bold text-gray-900">
                {donutData.length > 0 ? `${donutData[0].value}%` : "N/A"}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {donutData.length > 0 ? donutData[0].name : "No data available"}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Row: Area Chart and Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area Chart - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-200"></div>
                <span className="text-sm text-gray-700">
                  {countryTrends[0]?.id || "Top Destination"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-200"></div>
                <span className="text-sm text-gray-700">
                  {countryTrends[1]?.id || "Second Destination"}
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={areaChartData.length > 0 ? areaChartData : []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="year" stroke="#6b7280" />
                <YAxis stroke="#6b7280" tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip 
                  formatter={(value: number) => `${value.toLocaleString()}`}
                />
                <Area
                  type="monotone"
                  dataKey="value1"
                  stackId="1"
                  stroke="#FFCCBC"
                  fill="#FFCCBC"
                  fillOpacity={0.6}
                  name={countryTrends[0]?.id || "Top"}
                />
                <Area
                  type="monotone"
                  dataKey="value2"
                  stackId="1"
                  stroke="#B3E5FC"
                  fill="#B3E5FC"
                  fillOpacity={0.6}
                  name={countryTrends[1]?.id || "Second"}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Calendar - Takes 1 column */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <Calendar />
          </div>
        </div>
      </div>
    </div>
  );
}
