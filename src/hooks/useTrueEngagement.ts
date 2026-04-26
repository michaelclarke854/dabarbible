import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EngagementSummary {
  total_7d: number;
  engaged_7d: number;
  rate_7d: number;
  delta_7d: number | null;
  rate_prior7: number | null;
}

export interface DailyRow {
  day: string;
  total_anon_sessions: number;
  engaged_sessions: number;
  engagement_rate_pct: number;
}

export interface TrueEngagementData {
  summary: EngagementSummary;
  daily: DailyRow[];
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function useTrueEngagement() {
  const [data, setData] = useState<TrueEngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data: res, error: err } = await supabase.functions.invoke('admin-engagement');
    if (err) {
      setError('Could not load engagement data.');
    } else {
      setData(res as TrueEngagementData);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { data, loading, error, refresh: load };
}
