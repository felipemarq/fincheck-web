import { useContext } from "react";
import { DashboardContext } from "./DashboardContext";

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error(
      "useDashboardContext must be used within a DashboardContextProvider"
    );
  }

  return context;
};
