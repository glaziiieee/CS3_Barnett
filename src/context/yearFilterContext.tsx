import { createContext, useContext, useMemo, useState } from "react";

export type YearValue = number | "all";

type YearFilterContextValue = {
  selectedYear: YearValue;
  setSelectedYear: (year: YearValue) => void;
};

const YearFilterContext = createContext<YearFilterContextValue | null>(null);

export function YearFilterProvider({
  children,
  initialYear = "all",
}: {
  children: React.ReactNode;
  initialYear?: YearValue;
}) {
  const [selectedYear, setSelectedYear] = useState<YearValue>(initialYear);

  const value = useMemo(
    () => ({
      selectedYear,
      setSelectedYear,
    }),
    [selectedYear]
  );

  return (
    <YearFilterContext.Provider value={value}>
      {children}
    </YearFilterContext.Provider>
  );
}

export function useYearFilterContext() {
  const ctx = useContext(YearFilterContext);
  if (!ctx) {
    throw new Error("useYearFilterContext must be used within a YearFilterProvider");
  }
  return ctx;
}
