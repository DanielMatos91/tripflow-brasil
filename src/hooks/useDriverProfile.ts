import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Driver } from "@/types/database";

export function useDriverProfile() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchDriver = async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setDriver(data as Driver);
      }
      setLoading(false);
    };

    fetchDriver();
  }, [user]);

  return { driver, loading, isVerified: driver?.verified ?? false };
}
