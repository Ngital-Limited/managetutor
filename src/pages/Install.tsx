import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Share2, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    document.title = "Install Manage Tutor App";

    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success("App installed!");
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast.info("Use your browser menu → 'Install app' or 'Add to Home Screen'.");
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") toast.success("Installing Manage Tutor…");
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Install Manage Tutor</h1>
          <p className="text-muted-foreground">
            Get one-tap access from your home screen. Works offline-friendly, loads instantly, and feels like a native app.
          </p>
        </div>

        {isInstalled ? (
          <Card>
            <CardContent className="py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-semibold mb-1">App is installed</h2>
              <p className="text-muted-foreground">You're already running Manage Tutor as an installed app.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" /> Quick Install
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button size="lg" className="w-full" onClick={handleInstall}>
                  <Download className="mr-2 h-5 w-5" />
                  {deferredPrompt ? "Install App Now" : "Install (use browser menu)"}
                </Button>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Available on Chrome, Edge, Brave, and Samsung Internet.
                </p>
              </CardContent>
            </Card>

            {isIOS && (
              <Card>
                <CardHeader>
                  <CardTitle>Install on iPhone / iPad</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">1</div>
                    <p>Tap the <Share2 className="inline h-4 w-4 mx-1" /> <strong>Share</strong> button in Safari.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">2</div>
                    <p>Scroll down and tap <Plus className="inline h-4 w-4 mx-1" /> <strong>Add to Home Screen</strong>.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">3</div>
                    <p>Tap <strong>Add</strong> in the top-right corner.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Install on Android</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">1</div>
                  <p>Tap the <strong>⋮ menu</strong> in Chrome (top-right).</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">2</div>
                  <p>Tap <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">3</div>
                  <p>Confirm by tapping <strong>Install</strong>.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Install;
