import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function UnsubscribeVersePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "missing">(
    token ? "loading" : "missing",
  );
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { error } = await supabase.functions.invoke("daily-verse", {
        body: { action: "unsubscribe_token", token },
      });
      if (error) {
        setErrMsg(error.message);
        setStatus("error");
      } else {
        setStatus("success");
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="font-serif text-3xl text-foreground">Daily verse unsubscribed</h1>
        {status === "loading" && (
          <p className="text-muted-foreground font-body">Removing you from daily verses…</p>
        )}
        {status === "success" && (
          <p className="text-foreground font-body">
            Done. You won't receive any more daily verse emails. You can re-enable them any time from inside DABAR.
          </p>
        )}
        {status === "missing" && (
          <p className="text-muted-foreground font-body">No unsubscribe token provided.</p>
        )}
        {status === "error" && (
          <p className="text-destructive font-body">
            Something went wrong: {errMsg}. Please email mike@dabarbible.com.
          </p>
        )}
      </div>
    </div>
  );
}