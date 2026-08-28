"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export default function MfaVerifyPage() {
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkFactors = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        
        if (error) {
          toast.error("Failed to load authentication factors");
          return;
        }

        const totpFactor = data?.totp?.[0];
        
        if (!totpFactor) {
          // If they hit this page but don't have a factor, they need to setup
          router.push("/mfa-setup");
          return;
        }

        setFactorId(totpFactor.id);
      } catch (err) {
        toast.error("An unexpected error occurred");
      }
    };

    checkFactors();
  }, [router, supabase.auth.mfa]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      
      if (challenge.error) {
        toast.error(challenge.error.message);
        setLoading(false);
        return;
      }

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode,
      });

      if (verify.error) {
        toast.error(verify.error.message);
        return;
      }

      router.push("/send");
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm border text-center">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Two-Factor Auth</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-6 text-left">
          <div className="space-y-2 text-left">
            <Label htmlFor="code">Authentication Code</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              placeholder="000000"
              required
              className="text-center tracking-widest text-lg h-12"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || verifyCode.length !== 6 || !factorId}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
          </Button>
        </form>
      </div>
    </div>
  );
}
