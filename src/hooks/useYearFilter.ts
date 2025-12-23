import { useMemo } from "react";
import { useYearFilterContext, type YearValue } from "../context/yearFilterContext";

export type { YearValue };

export function useYearFilter(_initial: YearValue = "all") {
  const { selectedYear, setSelectedYear } = useYearFilterContext();

  const onSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const year = event.target.value;
    setSelectedYear(year === "all" ? "all" : parseInt(year, 10));
  };

  return useMemo(
    () => ({ selectedYear, setSelectedYear, onSelectChange }),
    [selectedYear]
  );
}