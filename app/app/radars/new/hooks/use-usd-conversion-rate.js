"use client";

import { useEffect, useState } from "react";

export function useUsdConversionRate(currency) {
  const normalized = String(currency || "USD").trim().toUpperCase();
  const [state, setState] = useState({ rate: normalized === "USD" ? 1 : null, rateDate: null, loading: false, error: "" });

  useEffect(() => {
    let cancelled = false;

    if (!normalized || normalized === "USD") {
      setState({ rate: 1, rateDate: new Date().toISOString().slice(0, 10), loading: false, error: "" });
      return () => { cancelled = true; };
    }

    async function load() {
      setState((previous) => ({ ...previous, loading: true, error: "" }));
      try {
        const response = await fetch(`https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(normalized)}&symbols=USD`, { cache: "no-store" });
        if (!response.ok) throw new Error(`FX request failed (${response.status})`);
        const json = await response.json();
        const rate = Number(json?.rates?.USD);
        if (!Number.isFinite(rate) || rate <= 0) throw new Error("Invalid USD conversion rate");
        if (!cancelled) setState({ rate, rateDate: json?.date || null, loading: false, error: "" });
      } catch (error) {
        if (!cancelled) setState({ rate: null, rateDate: null, loading: false, error: error.message || "Unable to load FX rate" });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [normalized]);

  return state;
}
