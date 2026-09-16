"use client";

import { useEffect, useMemo, useState } from "react";

export function useCountdown(closesAt: string | null) {
  const deadline = useMemo(() => closesAt ? new Date(closesAt).getTime() : null, [closesAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  if (!deadline) return { closed: false, label: "Open ranking", compact: "Open" };
  const remaining = Math.max(0, deadline - now);
  const closed = remaining <= 0;
  if (closed) return { closed: true, label: "Voting closed", compact: "Final" };
  const seconds = Math.floor(remaining / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const label = days > 0
    ? `${days}d ${hours}h ${minutes}m left`
    : hours > 0
      ? `${hours}h ${minutes}m ${secs}s left`
      : `${minutes}m ${secs}s left`;
  return { closed, label, compact: days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${secs}s` };
}
