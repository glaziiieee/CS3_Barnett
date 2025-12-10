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
} from "react-icons/ai";
import { MdRadar, MdAccountTree } from "react-icons/md";
import { Link } from "@tanstack/react-router";

const navigationItems = [
  {
    name: "Dashboard",
    icon: <AiFillDashboard className="text-white text-xl" />,
    path: "/",
  },
  {
    name: "Geographic",
    icon: <AiOutlineGlobal className="text-white text-xl" />,
    path: "/geographic",
  },
  {
    name: "Comparison",
    icon: <AiOutlineBarChart className="text-white text-xl" />,
    path: "/comparison",
  },
  {
    name: "Composition",
    icon: <AiOutlinePieChart className="text-white text-xl" />,
    path: "/composition",
  },
  {
    name: "Trends",
    icon: <AiOutlineLineChart className="text-white text-xl" />,
    path: "/trends",
  },
  {
    name: "ML Forecast",
    icon: <AiOutlineFundProjectionScreen className="text-white text-xl" />,
    path: "/forecast",
  },
  {
    name: "Distribution",
    icon: <AiOutlineAreaChart className="text-white text-xl" />,
    path: "/distribution",
  },
  {
    name: "Relationships",
    icon: <AiOutlineDotChart className="text-white text-xl" />,
    path: "/relationships",
  },
  {
    name: "Ranking",
    icon: <MdRadar className="text-white text-xl" />,
    path: "/radar",
  },
  {
    name: "Flow/Process",
    icon: <MdAccountTree className="text-white text-xl" />,
    path: "/parallel",
  },
  {
    name: "Upload Data",
    icon: <AiOutlineUpload className="text-white text-xl" />,
    path: "/upload",
  },
  {
    name: "Data Management",
    icon: <AiOutlineDatabase className="text-white text-xl" />,
    path: "/crud",
  },
];

const NavBar = forwardRef<HTMLElement>((_props, ref) => {
  return (
    <>
      {/* Desktop / wide screens: vertical sidebar on the left */}
      <nav
        ref={ref}
  className="hidden md:flex fixed top-0 left-0 bottom-0 z-50 w-56 bg-[#E5748F] border-r-2 border-highlights shadow-lg nav-hotpink"
      >
        <div className="flex flex-col items-start gap-2 h-full p-4 overflow-y-auto">
          <div className="mb-4 w-full flex items-center justify-center">
            {/* sidebar brand removed */}
          </div>
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/20 rounded-lg transition-colors whitespace-nowrap hover:cursor-pointer duration-300 ease-in-out"
            >
              {item.icon}
              <span className="text-white text-sm">{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile / small screens: keep horizontal top bar for easy access */}
  <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#E5748F] border-b-2 border-highlights shadow-lg nav-hotpink">
        <div className="flex items-center justify-center gap-2 h-16 px-4 overflow-x-auto">
          {navigationItems.map((item) => (
            <Link
              key={`mobile-${item.name}`}
              to={item.path}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/20 rounded-lg transition-colors whitespace-nowrap hover:cursor-pointer duration-300 ease-in-out"
            >
              {item.icon}
              <span className="text-white text-sm">{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
});

NavBar.displayName = "NavBar";

export default NavBar;
