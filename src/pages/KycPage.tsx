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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Upload, ShieldCheck, AlertCircle, CheckCircle2, RefreshCw, FileImage, Camera, IdCard } from "lucide-react";

const KycPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [existing, setExisting] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [step, setStep] = useState(1);
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
    if (!user) throw new Error("Please sign in again before uploading documents");
    const ext = f.name.split(".").pop();
    const path = `${user.id}/${key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, f, { upsert: true });
    if (error) throw error;
    return path;
  };

  const detailsValid = form.full_name.trim().length > 1 && form.id_number.trim().length > 1;
  const filesValid = !!(existing?.id_front_url || files.front) && !!(existing?.selfie_url || files.selfie);

  const submit = async () => {
    if (!user) return;
    if (!detailsValid) return toast.error("Fill all required fields");
    const isResubmit = existing && existing.status === "rejected";
    if (!existing && !filesValid) return toast.error("Upload ID front and selfie");

    setSubmitting(true);
    setUploadPct(10);
    try {
      const updates: any = { ...form };
      const tasks: Array<[string, File]> = [];
      if (files.front) tasks.push(["front", files.front]);
      if (files.back) tasks.push(["back", files.back]);
      if (files.selfie) tasks.push(["selfie", files.selfie]);
      let done = 0;
      for (const [k, f] of tasks) {
        const path = await upload(k as any, f);
        if (k === "selfie") updates.selfie_url = path;
        else updates[`id_${k}_url`] = path;
        done++;
        setUploadPct(10 + Math.round((done / Math.max(tasks.length, 1)) * 70));
      }

      if (existing) {
        updates.status = "pending";
        updates.rejection_reason = null;
        const { error } = await supabase.from("user_kyc").update(updates).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_kyc").insert({ ...updates, user_id: user.id, status: "pending" });
        if (error) throw error;
      }

      setUploadPct(100);
      toast.success(isResubmit ? "Resubmitted for review" : "KYC submitted for review");
      const { data } = await supabase.from("user_kyc").select("*").eq("user_id", user.id).maybeSingle();
      setExisting(data);
      setFiles({});
      setStep(3);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
      setTimeout(() => setUploadPct(0), 1200);
    }
  };

  if (loading || !user) return null;

  const status = existing?.status;
  const locked = status === "pending" || status === "approved";

  const FileTile = ({ k, label, icon: Icon, required }: { k: "front" | "back" | "selfie"; label: string; icon: any; required?: boolean }) => {
    const has = !!files[k] || (k === "front" ? !!existing?.id_front_url : k === "back" ? !!existing?.id_back_url : !!existing?.selfie_url);
    return (
      <label className={`flex items-center gap-3 p-3 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${has ? "border-[hsl(var(--success))]/60 bg-[hsl(var(--success))]/5" : "border-border hover:border-primary/60"}`}>
        <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${has ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]" : "bg-muted text-muted-foreground"}`}>
          {has ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate">{label}{required && <span className="text-destructive ml-1">*</span>}</p>
          <p className="text-[10px] text-muted-foreground truncate">{files[k]?.name ?? (has ? "Uploaded — tap to replace" : "JPG or PNG, clear & in focus")}</p>
        </div>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => setFiles({ ...files, [k]: e.target.files?.[0] })} />
      </label>
    );
  };

  const Stepper = () => (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold">
      {[
        { n: 1, l: "Details" },
        { n: 2, l: "Documents" },
        { n: 3, l: "Review" },
      ].map((s, i) => (
        <div key={s.n} className="flex items-center gap-1.5 flex-1">
          <div className={`w-6 h-6 rounded-full grid place-items-center transition-colors ${step >= s.n ? "gradient-lime text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {step > s.n ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
          </div>
          <span className={step >= s.n ? "" : "text-muted-foreground"}>{s.l}</span>
          {i < 2 && <div className={`h-px flex-1 ${step > s.n ? "bg-primary" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <AppShell title="Identity Verification" back>
      <div className="space-y-3 animate-fade-in">
        {status === "approved" && (
          <Card className="p-4 rounded-2xl bg-[hsl(var(--success))]/15 border-[hsl(var(--success))]/40">
            <div className="flex gap-3 items-start">
              <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Verified</p>
                <p className="text-xs text-muted-foreground">Your identity is approved. You can withdraw funds.</p>
              </div>
            </div>
          </Card>
        )}
        {status === "pending" && (
          <Card className="p-4 rounded-2xl bg-yellow-500/10 border-yellow-500/40">
            <div className="flex gap-3 items-start">
              <Loader2 className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5 animate-spin" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Under review</p>
                <p className="text-xs text-muted-foreground">Submitted {new Date(existing.created_at).toLocaleDateString()}. Usually approved within 24 hours.</p>
              </div>
            </div>
          </Card>
        )}
        {status === "rejected" && (
          <Card className="p-4 rounded-2xl bg-destructive/10 border-destructive/40">
            <div className="flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm flex items-center gap-2">Rejected <Badge variant="destructive" className="text-[10px]">Action needed</Badge></p>
                <p className="text-xs text-muted-foreground mt-0.5">{existing?.rejection_reason || "Please review and resubmit."}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Update the fields or documents below and resubmit for review.</p>
              </div>
            </div>
          </Card>
        )}

        {!locked && (
          <Card className="p-3 rounded-2xl bg-card border-border">
            <Stepper />
          </Card>
        )}

        <Card className="p-4 rounded-2xl space-y-3 bg-card border-border">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-primary" />
            {step === 1 ? "Personal details" : step === 2 ? "Upload documents" : "Review & submit"}
            {status && <Badge className="ml-auto text-[10px]">{status}</Badge>}
          </div>

          {(locked || step === 1) && (
            <div className="space-y-2 animate-fade-in">
              <div className="space-y-2">
                <Label className="text-xs">Full legal name *</Label>
                <Input disabled={locked} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-xl h-11" placeholder="As shown on your ID" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs">Date of birth</Label>
                  <Input disabled={locked} type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Country</Label>
                  <Input disabled={locked} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="rounded-xl h-11" placeholder="United States" />
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
                <Button onClick={() => { if (!detailsValid) return toast.error("Fill name and ID number"); setStep(2); }} className="w-full h-11 rounded-full gradient-lime text-primary-foreground border-0 font-semibold mt-1">
                  Continue to documents
                </Button>
              )}
            </div>
          )}

          {!locked && step === 2 && (
            <div className="space-y-2 animate-fade-in">
              <p className="text-[11px] text-muted-foreground">Upload clear photos. Make sure all four corners of the ID are visible and text is readable.</p>
              <FileTile k="front" label="ID front" icon={IdCard} required />
              <FileTile k="back" label="ID back" icon={IdCard} />
              <FileTile k="selfie" label="Selfie holding your ID" icon={Camera} required />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button variant="outline" onClick={() => setStep(1)} className="h-11 rounded-full">Back</Button>
                <Button onClick={() => { if (!filesValid) return toast.error("Upload ID front and selfie"); setStep(3); }} className="h-11 rounded-full gradient-lime text-primary-foreground border-0 font-semibold">Review</Button>
              </div>
            </div>
          )}

          {!locked && step === 3 && (
            <div className="space-y-2 animate-fade-in">
              <div className="rounded-xl bg-muted/40 p-3 space-y-1 text-xs">
                <p><span className="text-muted-foreground">Name:</span> <span className="font-semibold">{form.full_name}</span></p>
                <p><span className="text-muted-foreground">ID:</span> <span className="font-semibold">{form.id_type} · {form.id_number}</span></p>
                <p><span className="text-muted-foreground">Country:</span> <span className="font-semibold">{form.country || "—"}</span></p>
                <p className="flex items-center gap-2 pt-1">
                  <FileImage className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted-foreground">{Object.values(files).filter(Boolean).length || (existing ? "Existing" : 0)} file(s) ready</span>
                </p>
              </div>
              {uploadPct > 0 && <Progress value={uploadPct} className="h-2" />}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="h-11 rounded-full" disabled={submitting}>Back</Button>
                <Button onClick={submit} disabled={submitting} className="h-11 rounded-full gradient-lime text-primary-foreground border-0 font-semibold">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : status === "rejected" ? <RefreshCw className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  {status === "rejected" ? "Resubmit" : "Submit"}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <p className="text-[10px] text-muted-foreground text-center">Your documents are encrypted and only visible to verification staff.</p>
      </div>
    </AppShell>
  );
};

export default KycPage;
