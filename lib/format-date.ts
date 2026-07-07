/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useState } from "react";

type DateFormat = "US" | "EU" | "ISO";
type TimeFormat = "12h" | "24h";

interface Format {
  date: DateFormat;
  time: TimeFormat;
}

let cached: Format | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000;

async function loadFormat(): Promise<Format> {
  if (cached && Date.now() - cacheTime < CACHE_TTL) return cached;
  try {
    const res = await fetch("/api/v1/settings");
    const body = await res.json();
    const date = (body.data?.["appearance.date_format"] as DateFormat) ?? "US";
    const time = (body.data?.["appearance.time_format"] as TimeFormat) ?? "12h";
    cached = { date, time };
    cacheTime = Date.now();
    return cached;
  } catch {
    return { date: "US", time: "12h" };
  }
}

export function useDateTimeFormat() {
  const [format, setFormat] = useState<Format>({ date: "US", time: "12h" });

  useEffect(() => {
    loadFormat().then(setFormat);
  }, []);

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear().toString();
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const seconds = d.getSeconds().toString().padStart(2, "0");

    if (format.date === "EU") {
      const dt = `${day}/${month}/${year}`;
      if (format.time === "24h") return `${dt}, ${hours.toString().padStart(2, "0")}:${minutes}`;
      const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const ampm = hours < 12 ? "AM" : "PM";
      return `${dt}, ${h12}:${minutes} ${ampm}`;
    }

    if (format.date === "ISO") {
      const dt = `${year}-${month}-${day}`;
      if (format.time === "24h") return `${dt} ${hours.toString().padStart(2, "0")}:${minutes}:${seconds}`;
      const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const ampm = hours < 12 ? "AM" : "PM";
      return `${dt} ${h12}:${minutes}:${seconds} ${ampm}`;
    }

    if (format.time === "24h") return `${month}/${day}/${year}, ${hours.toString().padStart(2, "0")}:${minutes}`;
    return d.toLocaleString();
  };

  const formatDateShort = (dateStr: string | null): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (format.date === "EU") return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
    if (format.date === "ISO") return d.toISOString().slice(0, 10);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const formatTime = (dateStr: string | null): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (format.time === "24h") return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return { formatDate, formatDateShort, formatTime, format };
}
