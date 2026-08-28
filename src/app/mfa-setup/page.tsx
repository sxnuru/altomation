"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function MfaSetupPage() {
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const setupMfa = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: "totp",
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        if (data) {
          setFactorId(data.id);
          setQrCode(data.totp.uri);
        }
      } catch (err) {
        toast.error("Failed to initialize MFA setup");
      }
    };

    setupMfa();
  }, [supabase.auth.mfa]);

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

      toast.success("MFA successfully enabled!");
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
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Set up 2FA</h1>
          <p className="text-muted-foreground text-sm">
            Scan the QR code with Google Authenticator or Authy
          </p>
        </div>

        {qrCode ? (
          <div className="flex flex-col items-center gap-6">
            <div className="p-4 bg-white border rounded-xl">
              <QRCodeSVG value={qrCode} size={200} />
            </div>

            <form onSubmit={handleVerify} className="w-full space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="code">Enter 6-digit code</Label>
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
                  className="text-center tracking-widest text-lg"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || verifyCode.length !== 6}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Continue"}
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
