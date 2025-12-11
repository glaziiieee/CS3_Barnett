import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface NavBarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const NavBarContext = createContext<NavBarContextType | undefined>(undefined);

export const useNavBar = () => {
  const context = useContext(NavBarContext);
  if (context === undefined) {
    throw new Error("useNavBar must be used within a NavBarProvider");
  }
  return context;
};

export const NavBarProvider = ({ children }: { children: ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const value = {
    isCollapsed,
    setIsCollapsed,
  };

  return (
    <NavBarContext.Provider value={value}>{children}</NavBarContext.Provider>
  );
};
