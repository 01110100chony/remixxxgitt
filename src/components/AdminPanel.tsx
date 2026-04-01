import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Shield, UserPlus, Trash2, Loader2, Users, ShieldCheck, ShieldAlert, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  display_name: string;
  roles: string[];
}

const ROLE_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  admin: { label: "Admin", variant: "destructive" },
  coordinator: { label: "Coordenador", variant: "default" },
  researcher: { label: "Pesquisador", variant: "secondary" },
  viewer: { label: "Visualizador", variant: "outline" },
};

const ALL_ROLES = ["admin", "coordinator", "researcher", "viewer"];

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleToAdd, setRoleToAdd] = useState<Record<string, string>>({});
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviteLoading, setInviteLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-users", {
        method: "GET",
      });
      if (res.error) throw new Error(res.error.message);
      setUsers(res.data || []);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAction = async (action: string, targetUserId: string, role?: string) => {
    setActionLoading(`${action}-${targetUserId}-${role}`);
    try {
      const res = await supabase.functions.invoke("admin-users", {
        method: "POST",
        body: { action, target_user_id: targetUserId, role },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Sucesso", description: action === "delete_user" ? "Usuário removido." : "Papel atualizado." });
      await fetchUsers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      const res = await supabase.functions.invoke("admin-users", {
        method: "POST",
        body: { action: "invite_user", email: inviteEmail.trim(), invite_role: inviteRole },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Sucesso", description: `Convite enviado para ${inviteEmail}` });
      setInviteEmail("");
      await fetchUsers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setInviteLoading(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando usuários...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite user */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2 text-foreground">
          <Mail className="h-4 w-4" /> Convidar novo usuário
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="usuario@exemplo.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div className="w-40 space-y-1">
            <Label>Papel inicial</Label>
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]?.label || r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} disabled={inviteLoading || !inviteEmail.trim()}>
            {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
            Enviar convite
          </Button>
        </div>
      </div>

      {/* Header stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Total usuários", value: users.length, icon: Users },
          { label: "Admins", value: users.filter((u) => u.roles.includes("admin")).length, icon: ShieldAlert },
          { label: "Coordenadores", value: users.filter((u) => u.roles.includes("coordinator")).length, icon: ShieldCheck },
          { label: "Visualizadores", value: users.filter((u) => u.roles.includes("viewer")).length, icon: Shield },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border bg-card p-4 text-center">
            <Icon className="h-4 w-4 text-accent mx-auto mb-1" />
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Papéis</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Adicionar papel</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const availableRoles = ALL_ROLES.filter((r) => !u.roles.includes(r));
              const isCurrentUser = u.id === user?.id;

              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.display_name}
                    {isCurrentUser && <span className="text-xs text-accent ml-1">(você)</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && (
                        <span className="text-xs text-muted-foreground">Sem papéis</span>
                      )}
                      {u.roles.map((role) => {
                        const cfg = ROLE_LABELS[role] || { label: role, variant: "outline" as const };
                        return (
                          <div key={role} className="flex items-center gap-0.5">
                            <Badge variant={cfg.variant}>{cfg.label}</Badge>
                            {!isCurrentUser && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                disabled={actionLoading === `remove_role-${u.id}-${role}`}
                                onClick={() => handleAction("remove_role", u.id, role)}
                              >
                                {actionLoading === `remove_role-${u.id}-${role}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                )}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(u.created_at)}</TableCell>
                  <TableCell className="text-xs">{formatDate(u.last_sign_in_at)}</TableCell>
                  <TableCell>
                    {availableRoles.length > 0 && !isCurrentUser && (
                      <div className="flex items-center gap-1">
                        <Select
                          value={roleToAdd[u.id] || ""}
                          onValueChange={(val) => setRoleToAdd((prev) => ({ ...prev, [u.id]: val }))}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue placeholder="Papel" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]?.label || r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          disabled={!roleToAdd[u.id] || actionLoading === `add_role-${u.id}-${roleToAdd[u.id]}`}
                          onClick={() => {
                            if (roleToAdd[u.id]) {
                              handleAction("add_role", u.id, roleToAdd[u.id]);
                              setRoleToAdd((prev) => ({ ...prev, [u.id]: "" }));
                            }
                          }}
                        >
                          {actionLoading?.startsWith(`add_role-${u.id}`) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <UserPlus className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {!isCurrentUser && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso removerá permanentemente o usuário <strong>{u.email}</strong> e todos os seus dados. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleAction("delete_user", u.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {actionLoading === `delete_user-${u.id}-undefined` ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : null}
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
