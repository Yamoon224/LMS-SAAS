"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchDashboard } from "../api/dashboard.api";

export const dashboardKey = ["learner-dashboard"] as const;

export function useDashboard() {
  return useQuery({ queryKey: dashboardKey, queryFn: fetchDashboard });
}
