import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Upload, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";

const KycPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [existing, setExisting] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name: "", dob: "", country: "", id_type: "passport", id_number: "" });
  const [files, setFiles] = useState<{ front?: File; back?: File; selfie?: File }>({});

  useEffect(() => {
    document.title = "KYC — CryptoVest";
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_kyc").select("*").eq("user_id", user.id).maybeSingle();
      setExisting(data);
      if (data) setForm({ full_name: data.full_name, dob: data.dob ?? "", country: data.country ?? "", id_type: data.id_type, id_number: data.id_number });
    })();
  }, [user]);

  const upload = async (key: "front" | "back" | "selfie", f: File) => {
    const ext = f.name.split(".").pop();
    const path = `${user!.id}/${key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, f, { upsert: true });
    if (error) throw error;
    return path;
  };

  const submit = async () => {
    if (!user) return;
    if (!form.full_name || !form.id_number) return toast.error("Fill all required fields");
    const isResubmit = existing && existing.status === "rejected";
    if (!existing && (!files.front || !files.selfie)) return toast.error("Upload ID front and selfie");

    setSubmitting(true);
    try {
      const updates: any = { ...form };
      if (files.front) updates.id_front_url = await upload("front", files.front);
      if (files.back) updates.id_back_url = await upload("back", files.back);
      if (files.selfie) updates.selfie_url = await upload("selfie", files.selfie);

      if (existing) {
        updates.status = "pending";
        updates.rejection_reason = null;
        const { error } = await supabase.from("user_kyc").update(updates).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_kyc").insert({ ...updates, user_id: user.id, status: "pending" });
        if (error) throw error;
      }

      toast.success(isResubmit ? "Resubmitted for review" : "KYC submitted for review");
      const { data } = await supabase.from("user_kyc").select("*").eq("user_id", user.id).maybeSingle();
      setExisting(data);
      setFiles({});
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return null;

  const status = existing?.status;
  const locked = status === "pending" || status === "approved";

  return (
    <AppShell title="Identity Verification" back>
      <div className="space-y-3">
        {status === "approved" && (
          <Card className="p-4 rounded-2xl bg-[hsl(var(--success))]/15 border-[hsl(var(--success))]/40">
            <div className="flex gap-3 items-start">
              <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Verified</p>
                <p className="text-xs text-muted-foreground">You can withdraw funds.</p>
              </div>
            </div>
          </Card>
        )}
        {status === "pending" && (
          <Card className="p-4 rounded-2xl bg-yellow-500/10 border-yellow-500/40">
            <div className="flex gap-3 items-start">
              <Loader2 className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5 animate-spin" />
              <div>
                <p className="font-semibold text-sm">Under review</p>
                <p className="text-xs text-muted-foreground">Usually approved within 24 hours.</p>
              </div>
            </div>
          </Card>
        )}
        {status === "rejected" && (
          <Card className="p-4 rounded-2xl bg-destructive/10 border-destructive/40">
            <div className="flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Rejected</p>
                <p className="text-xs text-muted-foreground">{existing?.rejection_reason || "Please review and resubmit."}</p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4 rounded-2xl space-y-3 bg-card border-border">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-primary" />
            KYC details {status && <Badge className="ml-auto text-[10px]">{status}</Badge>}
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Full legal name *</Label>
            <Input disabled={locked} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-xl h-11" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-xs">Date of birth</Label>
              <Input disabled={locked} type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Country</Label>
              <Input disabled={locked} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="rounded-xl h-11" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-xs">ID type</Label>
              <select disabled={locked} value={form.id_type} onChange={(e) => setForm({ ...form, id_type: e.target.value })} className="w-full h-11 rounded-xl bg-background border border-border px-3 text-sm">
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
                <option value="drivers_license">Driver's License</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">ID number *</Label>
              <Input disabled={locked} value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} className="rounded-xl h-11" />
            </div>
          </div>

          {!locked && (
            <div className="space-y-2 pt-1">
              {([["front", "ID front *"], ["back", "ID back"], ["selfie", "Selfie with ID *"]] as const).map(([k, l]) => (
                <label key={k} className="flex items-center gap-3 p-3 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary/60">
                  <Upload className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs truncate">{files[k]?.name ?? l}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setFiles({ ...files, [k]: e.target.files?.[0] })} />
                </label>
              ))}
            </div>
          )}

          {!locked && (
            <Button onClick={submit} disabled={submitting} className="w-full h-12 rounded-full gradient-lime text-primary-foreground border-0 font-semibold">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {status === "rejected" ? "Resubmit" : "Submit for review"}
            </Button>
          )}
        </Card>
      </div>
    </AppShell>
  );
};

export default KycPage;
