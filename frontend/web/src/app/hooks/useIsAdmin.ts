import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userErr || !user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();

      if (!mounted) return;

      if (error || !data) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(!!data.is_admin);
      setLoading(false);
    }

    run();

    const { data: sub } = supabase.auth.onAuthStateChange(() => run());

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, loading };
}
