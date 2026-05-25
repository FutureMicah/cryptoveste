import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, Loader2, ShieldCheck, LogOut, KeyRound } from "lucide-react";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<any>({ first_name: "", last_name: "", phone: "", country: "", avatar_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    document.title = "Profile — CryptoVest";
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) setProfile(data);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      first_name: profile.first_name, last_name: profile.last_name,
      phone: profile.phone, country: profile.country,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", user.id);
      if (error) throw error;
      setProfile({ ...profile, avatar_url: pub.publicUrl });
      toast.success("Photo updated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const resetPassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent");
  };

  if (loading || !user) return null;

  return (
    <AppShell title="Profile" back>
      <div className="space-y-3">
        <Card className="p-4 rounded-2xl bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-muted overflow-hidden gradient-lime grid place-items-center text-primary-foreground font-bold text-xl">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (user.email?.[0] ?? "U").toUpperCase()}
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center cursor-pointer">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
              </label>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{profile.first_name || user.email}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border-border space-y-3">
          <p className="text-xs font-semibold">Personal info</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label className="text-[11px]">First name</Label><Input className="rounded-xl h-10" value={profile.first_name ?? ""} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-[11px]">Last name</Label><Input className="rounded-xl h-10" value={profile.last_name ?? ""} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-[11px]">Phone</Label><Input className="rounded-xl h-10" value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-[11px]">Country</Label><Input className="rounded-xl h-10" value={profile.country ?? ""} onChange={(e) => setProfile({ ...profile, country: e.target.value })} /></div>
          <Button onClick={save} disabled={saving} className="w-full h-11 rounded-full gradient-lime text-primary-foreground border-0">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save changes
          </Button>
        </Card>

        <button onClick={() => navigate("/kyc")} className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/15 text-primary grid place-items-center"><ShieldCheck className="w-4 h-4" /></div>
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold">Identity verification (KYC)</p>
            <p className="text-[11px] text-muted-foreground">Required for withdrawals</p>
          </div>
          <span className="text-xs text-primary">›</span>
        </button>

        <button onClick={resetPassword} className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/15 text-primary grid place-items-center"><KeyRound className="w-4 h-4" /></div>
          <p className="text-xs font-semibold flex-1 text-left">Change password</p>
        </button>

        <button onClick={() => signOut().then(() => navigate("/"))} className="w-full p-4 rounded-2xl bg-destructive/10 border border-destructive/40 flex items-center gap-3 text-destructive">
          <LogOut className="w-4 h-4" /> <p className="text-xs font-semibold">Sign out</p>
        </button>
      </div>
    </AppShell>
  );
};

export default ProfilePage;
