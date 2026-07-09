"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

export function ClarityAnalytics() {
  useEffect(() => {
    const projectId = "xjnhzbnfc9";
    Clarity.init(projectId);
  }, []);

  return null;
}
