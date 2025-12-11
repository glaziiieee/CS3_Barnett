import { forwardRef } from "react";
import {
  AiFillDashboard,
  AiOutlineBarChart,
  AiOutlinePieChart,
  AiOutlineLineChart,
  AiOutlineAreaChart,
  AiOutlineDotChart,
  AiOutlineUpload,
  AiOutlineGlobal,
  AiOutlineDatabase,
  AiOutlineFundProjectionScreen,
  AiOutlineMenu,
  AiOutlineClose,
} from "react-icons/ai";
import { MdRadar, MdAccountTree } from "react-icons/md";
import { Link, useLocation } from "@tanstack/react-router";
import { useNavBar } from "../context/navBarContext";

const navigationItems = [
  {
    name: "Dashboard",
    icon: <AiFillDashboard className="text-xl" />,
    path: "/",
  },
  {
    name: "Geographic",
    icon: <AiOutlineGlobal className="text-xl" />,
    path: "/geographic",
  },
  {
    name: "Comparison",
    icon: <AiOutlineBarChart className="text-xl" />,
    path: "/comparison",
  },
  {
    name: "Composition",
    icon: <AiOutlinePieChart className="text-xl" />,
    path: "/composition",
  },
  {
    name: "Trends",
    icon: <AiOutlineLineChart className="text-xl" />,
    path: "/trends",
  },
  {
    name: "ML Forecast",
    icon: <AiOutlineFundProjectionScreen className="text-xl" />,
    path: "/forecast",
  },
  {
    name: "Distribution",
    icon: <AiOutlineAreaChart className="text-xl" />,
    path: "/distribution",
  },
  {
    name: "Relationships",
    icon: <AiOutlineDotChart className="text-xl" />,
    path: "/relationships",
  },
  {
    name: "Ranking",
    icon: <MdRadar className="text-xl" />,
    path: "/radar",
  },
  {
    name: "Flow/Process",
    icon: <MdAccountTree className="text-xl" />,
    path: "/parallel",
  },
  {
    name: "Upload Data",
    icon: <AiOutlineUpload className="text-xl" />,
    path: "/upload",
  },
  {
    name: "Data Management",
    icon: <AiOutlineDatabase className="text-xl" />,
    path: "/crud",
  },
];

const NavBar = forwardRef<HTMLElement>((_props, ref) => {
  const { isCollapsed, setIsCollapsed } = useNavBar();
  const location = useLocation();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Desktop / wide screens: vertical sidebar on the left */}
      <nav
        ref={ref}
        className={`hidden md:flex fixed top-4 left-4 bottom-4 z-50 ${
          isCollapsed ? "w-20" : "w-64"
        } bg-white rounded-lg shadow-lg transition-all duration-300 ease-in-out`}
      >
        <div className="flex flex-col h-full w-full">
          {/* Top Section - Company Name */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-center">
              {!isCollapsed && (
                <span className="text-[#E5748F] font-bold text-sm text-center">
                  FILIPINO EMIGRANTS
                </span>
              )}
              {isCollapsed && (
                <span className="text-[#E5748F] font-bold text-xs text-center">
                  FE
                </span>
              )}
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto py-4 px-3">
            {navigationItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 mb-1 group ${
                    active
                      ? "bg-pink-100 text-gray-800"
                      : "text-gray-600 hover:bg-gray-100"
                  } ${isCollapsed ? "justify-center" : ""}`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <span className={active ? "text-gray-800" : "text-gray-600"}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="text-sm font-medium">{item.name}</span>
                  )}
                </Link>
              );
            })}

          </div>

          {/* Toggle Button */}
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <AiOutlineMenu className="text-xl" />
              ) : (
                <>
                  <AiOutlineClose className="text-xl" />
                  <span className="text-sm">Collapse</span>
                </>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile / small screens: keep horizontal top bar for easy access */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-lg">
        <div className="flex items-center justify-center gap-2 h-16 px-4 overflow-x-auto">
          {navigationItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={`mobile-${item.name}`}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  active
                    ? "bg-pink-100 text-gray-800"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{item.icon}</span>
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
});

NavBar.displayName = "NavBar";

export default NavBar;
