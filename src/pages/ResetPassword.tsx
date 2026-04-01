import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get("type") === "recovery") {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Senha atualizada!", description: "Você já pode usar sua nova senha." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <BookOpen className="h-8 w-8 text-accent" />
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Lattes <span className="text-accent">Reader</span>
            </h1>
          </div>
          <p className="text-muted-foreground">Link inválido ou expirado. Solicite um novo link de recuperação.</p>
          <Button onClick={() => navigate("/auth")} variant="outline">Voltar ao login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <BookOpen className="h-8 w-8 text-accent" />
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Lattes <span className="text-accent">Reader</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">Redefinir senha</p>
        </div>
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground text-center">Nova senha</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <KeyRound className="h-4 w-4 mr-2" />
              {loading ? "Aguarde..." : "Redefinir senha"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
