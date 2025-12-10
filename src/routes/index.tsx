import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  AiOutlineBarChart,
  AiOutlineLineChart,
  AiOutlineGlobal,
} from "react-icons/ai";
import { useDashboardStats } from "../hooks/useDashboardStats";

export const Route = createFileRoute("/")({
  component: Index,
});

const dashboardCards = [
  {
    title: "Geographic Visualization",
    description: "Interactive choropleth maps of emigrant data",
    path: "/geographic",
    color: "from-green-500 to-green-600",
  },
  {
    title: "Comparison Charts",
    description: "Compare emigrant data across different categories",
    path: "/comparison",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    title: "Composition Charts",
    description: "View data composition and proportions",
    path: "/composition",
    color: "from-lime-500 to-lime-600",
  },
  {
    title: "Trend Analysis",
    description: "Analyze trends over time",
    path: "/trends",
    color: "from-teal-500 to-teal-600",
  },
  {
    title: "ML Forecast",
    description: "Explore machine learning-driven projections",
    path: "/forecast",
    color: "from-sky-500 to-sky-600",
  },
  {
    title: "Distribution Charts",
    description: "Visualize data distribution patterns",
    path: "/distribution",
    color: "from-green-600 to-green-700",
  },
  {
    title: "Relationship Analysis",
    description: "Explore correlations and relationships",
    path: "/relationships",
    color: "from-emerald-600 to-emerald-700",
  },
  {
    title: "Radar Chart Analysis",
    description: "Compare multiple dimensions using spider/web charts",
    path: "/radar",
    color: "from-lime-600 to-lime-700",
  },
  {
    title: "Parallel Sets Flow",
    description: "Visualize data flow between categories",
    path: "/parallel",
    color: "from-green-400 to-green-500",
  },
  {
    title: "Upload Data",
    description: "Upload CSV files to Firebase",
    path: "/upload",
    color: "from-teal-600 to-teal-700",
  },
  {
    title: "Data Management (CRUD)",
    description: "Create, read, update, and delete data records",
    path: "/crud",
    color: "from-emerald-700 to-emerald-800",
  },
];

function Index() {
  const stats = useDashboardStats();

  if (stats.isLoading) {
    return (
      <div className="p-6 bg-primary min-h-screen flex items-center justify-center">
        <div className="text-gray-300">Loading dashboard data...</div>
      </div>
    );
  }

  if (stats.error) {
    return (
      <div className="p-6 bg-primary min-h-screen flex items-center justify-center">
        <div className="text-red-400">
          Error loading dashboard: {stats.error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-primary min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Filipino Emigrants Dashboard
          </h1>
          <p className="text-gray-300 text-lg">
            Comprehensive analysis of Filipino emigrant data
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-secondary rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Countries</p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalCountries}
                </p>
              </div>
              <AiOutlineGlobal className="text-3xl text-highlights" />
            </div>
          </div>
          <div className="bg-secondary rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Data Years</p>
                <p className="text-2xl font-bold text-white">
                  {stats.dataYears}
                </p>
              </div>
              <AiOutlineLineChart className="text-3xl text-highlights" />
            </div>
          </div>
          <div className="bg-secondary rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Emigrants (M)</p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalEmigrants}M
                </p>
              </div>
              <AiOutlineBarChart className="text-3xl text-highlights" />
            </div>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {dashboardCards.map((card) => (
            <Link
              key={card.title}
              to={card.path}
              className="group bg-secondary rounded-lg p-6 border border-gray-700 hover:border-highlights transition-all duration-300 hover:shadow-lg hover:shadow-highlights/20"
            >
              {/* icon removed */}
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-highlights transition-colors">
                {card.title}
              </h3>
              <p className="text-gray-400 text-sm">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
