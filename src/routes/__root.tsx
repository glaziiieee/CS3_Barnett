import { useRef } from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import Header from "../components/header";
import NavBar from "../components/navBar";
import { NavBarProvider, useNavBar } from "../context/navBarContext";

const RootLayoutContent = () => {
  const headerRef = useRef<HTMLElement>(null);
  const navBarRef = useRef<HTMLElement>(null);
  const { isCollapsed } = useNavBar();

  return (
    <div className="app-layout flex flex-col h-screen">
      <nav className="topbar" role="navigation" aria-label="Main navigation">
        <NavBar ref={navBarRef} />
      </nav>

      <div
        className={`main-content flex-1 flex flex-col overflow-hidden mt-16 md:mt-0 transition-all duration-300 ${
          isCollapsed ? "md:ml-28" : "md:ml-72"
        }`}
      >
        <Header ref={headerRef} />

        <main
          className="content flex-1 overflow-auto px-4 py-2 bg-white"
          role="main"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const RootLayout = () => {
  return <RootLayoutContent />;
};

export const Route = createRootRoute({
  component: () => {
    return (
      <NavBarProvider>
        <RootLayout />
      </NavBarProvider>
    );
  },
});
