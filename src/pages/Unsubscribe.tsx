import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      setMessage("No unsubscribe token provided.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else {
          setState("invalid");
          setMessage(data.error || "Invalid or expired link.");
        }
      } catch {
        setState("error");
        setMessage("Could not verify your unsubscribe link. Please try again.");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success || data?.reason === "already_unsubscribed") setState("done");
      else {
        setState("error");
        setMessage(data?.error || "Could not process your request.");
      }
    } catch (err: any) {
      setState("error");
      setMessage(err?.message || "Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-xl">ManageTutor — Email preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "loading" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Verifying your link…
            </div>
          )}

          {state === "valid" && (
            <>
              <p className="text-sm">
                Click the button below to unsubscribe this email address from ManageTutor
                app emails (welcome, confirmations, notifications). Account security
                and authentication emails will still be delivered.
              </p>
              <Button onClick={confirm} className="w-full">Confirm Unsubscribe</Button>
            </>
          )}

          {state === "submitting" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Processing…
            </div>
          )}

          {state === "done" && (
            <div className="flex items-start gap-2 text-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
              <p className="text-sm">
                You've been unsubscribed. We're sorry to see you go — you can re-enable
                emails anytime from your dashboard settings.
              </p>
            </div>
          )}

          {state === "already" && (
            <div className="flex items-start gap-2 text-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
              <p className="text-sm">This address is already unsubscribed.</p>
            </div>
          )}

          {(state === "invalid" || state === "error") && (
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <p className="text-sm">{message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
