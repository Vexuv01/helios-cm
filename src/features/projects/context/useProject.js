import { createContext, useContext } from "react";

export const ProjectContext = createContext(null);

export function useProject() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error("useProject must be used inside ProjectProvider");
  }

  return context;
}
