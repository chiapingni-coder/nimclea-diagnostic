import { runRoutingMap } from "./runRoutingMap";

export function resolveRun({ primarySignalKey }) {
  return runRoutingMap[primarySignalKey] || "RUN001";
}