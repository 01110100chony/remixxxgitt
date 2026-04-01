import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, User, Lock, Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  coordinator: "Coordenador",
  researcher: "Pesquisador",
  viewer: "Visualizador",
};

const Profile = () => {
  const { user, roles, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();
      if (data?.display_name) setDisplayName(data.display_name);
    };
    loadProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Salvo!", description: "Nome atualizado com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Erro", description: "A nova senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Senha alterada!", description: "Sua senha foi atualizada com sucesso." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex items-center gap-3 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-xl font-bold text-foreground">Meu Perfil</h1>
        </div>
      </header>

      <main className="container py-8 max-w-lg space-y-6">
        {/* Profile info */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-accent" /> Dados pessoais
          </h3>
          <div className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input value={user.email || ""} disabled className="mt-1 bg-muted" />
            </div>
            <div>
              <Label>Nome de exibição</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome"
                className="mt-1"
              />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            {saving ? "Salvando..." : "Salvar nome"}
          </Button>
        </div>

        {/* Roles */}
        <div className="rounded-lg border bg-card p-6 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" /> Papéis
          </h3>
          <div className="flex flex-wrap gap-2">
            {roles.length === 0 ? (
              <span className="text-sm text-muted-foreground">Nenhum papel atribuído</span>
            ) : (
              roles.map((role) => (
                <Badge key={role} variant={role === "admin" ? "destructive" : "default"}>
                  {ROLE_LABELS[role] || role}
                </Badge>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Os papéis são gerenciados pelo administrador do sistema.
          </p>
        </div>

        {/* Change password */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Lock className="h-5 w-5 text-accent" /> Alterar senha
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                required
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={changingPassword} size="sm">
              {changingPassword ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Lock className="h-4 w-4 mr-1" />}
              {changingPassword ? "Alterando..." : "Alterar senha"}
            </Button>
          </form>
        </div>

        {/* Account info */}
        <div className="rounded-lg border bg-card p-6 space-y-2">
          <p className="text-xs text-muted-foreground">
            Conta criada em: {user.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            ID: <span className="font-mono">{user.id.slice(0, 8)}...</span>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Profile;
