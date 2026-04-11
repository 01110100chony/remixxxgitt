import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Loader2, Clock, Users, ExternalLink } from "lucide-react";

interface AccessRequest {
  id: string;
  user_id: string;
  program_id: string;
  requested_role: string;
  status: string;
  full_name: string;
  institutional_email: string | null;
  lattes_url: string | null;
  message: string | null;
  created_at: string;
}

interface Props {
  programId: string;
}

export default function AccessRequestsPanel({ programId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("access_requests")
      .select("*")
      .eq("program_id", programId)
      .order("created_at", { ascending: false });
    setRequests((data as AccessRequest[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [programId]);

  const handleAction = async (requestId: string, action: "approved" | "rejected") => {
    setActionLoading(requestId);
    const request = requests.find(r => r.id === requestId);

    const { error } = await supabase
      .from("access_requests")
      .update({
        status: action,
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      if (action === "approved" && request) {
        // Add the role to the user
        const roleToAdd = request.requested_role === "researcher" ? "researcher" : "viewer";
        await supabase.from("user_roles").upsert({
          user_id: request.user_id,
          role: roleToAdd,
        } as any, { onConflict: "user_id,role" }).select();

        // Update profile with institutional email and lattes
        if (request.institutional_email || request.lattes_url) {
          await supabase.from("profiles").update({
            institutional_email: request.institutional_email,
            lattes_url: request.lattes_url,
            display_name: request.full_name,
          }).eq("user_id", request.user_id);
        }
      }

      toast({
        title: action === "approved" ? "Solicitação aprovada" : "Solicitação negada",
        description: `${request?.full_name || "Usuário"} foi ${action === "approved" ? "aprovado(a)" : "negado(a)"}.`,
      });
      await fetchRequests();
    }
    setActionLoading(null);
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando solicitações...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-accent" />
        <h3 className="text-lg font-semibold text-foreground">Solicitações de Acesso</h3>
        {pendingCount > 0 && (
          <Badge variant="destructive">{pendingCount} pendente{pendingCount > 1 ? "s" : ""}</Badge>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Nenhuma solicitação de acesso.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email institucional</TableHead>
                <TableHead>Lattes</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">
                    {req.full_name}
                    {req.message && (
                      <p className="text-xs text-muted-foreground mt-0.5">{req.message}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{req.institutional_email || "—"}</TableCell>
                  <TableCell>
                    {req.lattes_url ? (
                      <a href={req.lattes_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center gap-1 text-sm">
                        Lattes <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={req.requested_role === "researcher" ? "default" : "secondary"}>
                      {req.requested_role === "researcher" ? "Docente" : "Colaborador"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(req.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {req.status === "approved" && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {req.status === "rejected" && <XCircle className="h-4 w-4 text-destructive" />}
                      {req.status === "pending" && <Clock className="h-4 w-4 text-yellow-500" />}
                      <span className="text-sm capitalize">
                        {req.status === "approved" ? "Aprovada" : req.status === "rejected" ? "Negada" : "Pendente"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {req.status === "pending" && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          disabled={actionLoading === req.id}
                          onClick={() => handleAction(req.id, "approved")}
                        >
                          {actionLoading === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionLoading === req.id}
                          onClick={() => handleAction(req.id, "rejected")}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Negar
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
