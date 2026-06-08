import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const email = params.get("email");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "missing">(
    email ? "loading" : "missing",
  );
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => {
    if (!email) return;
    (async () => {
      const { error } = await supabase.functions.invoke("pastoral-outreach", {
        body: { action: "unsubscribe", email },
      });
      if (error) {
        setErrMsg(error.message);
        setStatus("error");
      } else {
        setStatus("success");
      }
    })();
  }, [email]);

  return (
    <>
      <Helmet>
        <title>Unsubscribe — Dabar Bible</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="font-serif text-3xl text-foreground">Unsubscribe</h1>
        {status === "loading" && (
          <p className="text-muted-foreground font-body">Removing {email} from DABAR pastoral outreach…</p>
        )}
        {status === "success" && (
          <p className="text-foreground font-body">
            You've been removed from DABAR pastoral outreach. You won't receive further emails from us.
          </p>
        )}
        {status === "missing" && (
          <p className="text-muted-foreground font-body">No email address provided.</p>
        )}
        {status === "error" && (
          <p className="text-destructive font-body">
            We couldn't process your request: {errMsg}. Please email mike@dabarbible.com and we'll remove you manually.
          </p>
        )}
      </div>
    </div>
    </>
  );
}