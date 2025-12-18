import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Driver } from "@/types/database";

export function useDriverProfile() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDriver = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      setDriver(data as Driver);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDriver();
  }, [fetchDriver]);

  const refetch = useCallback(() => {
    setLoading(true);
    fetchDriver();
  }, [fetchDriver]);

  return { 
    driver, 
    loading, 
    isVerified: driver?.verified ?? false,
    isStripeConnected: !!driver?.stripe_account_id,
    refetch
  };
}
