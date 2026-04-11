import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, Plus, GraduationCap, Users, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";

interface ProgramResult {
  id: string;
  name: string;
  institution: string;
  area: string | null;
}

interface AccessRequest {
  id: string;
  program_id: string;
  requested_role: string;
  status: string;
  created_at: string;
  programs?: { name: string; institution: string } | null;
}

type Step = "search" | "choose-role" | "docente-form" | "create-program" | "pending";

const Onboarding = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProgramResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<ProgramResult | null>(null);
  const [myRequests, setMyRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Docente form
  const [fullName, setFullName] = useState("");
  const [institutionalEmail, setInstitutionalEmail] = useState("");
  const [lattesUrl, setLattesUrl] = useState("");
  const [message, setMessage] = useState("");

  // Create program form
  const [newProgramName, setNewProgramName] = useState("");
  const [newProgramInst, setNewProgramInst] = useState("");
  const [newProgramArea, setNewProgramArea] = useState("");
  const [newProgramModality, setNewProgramModality] = useState("");
  const [newProgramCode, setNewProgramCode] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchMyRequests();
    // Set default name from profile
    const meta = user.user_metadata;
    if (meta?.display_name) setFullName(meta.display_name);
    if (user.email) setInstitutionalEmail(user.email);
  }, [user]);

  const fetchMyRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("access_requests")
      .select("id, program_id, requested_role, status, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      // Fetch program names
      const programIds = [...new Set(data.map(r => r.program_id))];
      const { data: programs } = await supabase
        .from("programs")
        .select("id, name, institution")
        .in("id", programIds);

      const enriched = data.map(r => ({
        ...r,
        programs: programs?.find(p => p.id === r.program_id) || null,
      }));
      setMyRequests(enriched);
    } else {
      setMyRequests([]);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from("programs")
      .select("id, name, institution, area")
      .or(`name.ilike.%${searchQuery.trim()}%,institution.ilike.%${searchQuery.trim()}%`)
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const handleSelectProgram = (program: ProgramResult) => {
    setSelectedProgram(program);
    setStep("choose-role");
  };

  const handleSubmitDocenteRequest = async () => {
    if (!selectedProgram || !fullName.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("access_requests").insert({
      user_id: user!.id,
      program_id: selectedProgram.id,
      requested_role: "researcher",
      full_name: fullName.trim(),
      institutional_email: institutionalEmail.trim() || null,
      lattes_url: lattesUrl.trim() || null,
      message: message.trim() || null,
    } as any);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Solicitação enviada!", description: "O coordenador do programa será notificado." });
      await fetchMyRequests();
      setStep("search");
      setSelectedProgram(null);
    }
    setSubmitting(false);
  };

  const handleSubmitCollaboratorRequest = async () => {
    if (!selectedProgram || !fullName.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("access_requests").insert({
      user_id: user!.id,
      program_id: selectedProgram.id,
      requested_role: "viewer",
      full_name: fullName.trim(),
      institutional_email: institutionalEmail.trim() || null,
      message: message.trim() || null,
    } as any);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Solicitação enviada!", description: "O coordenador do programa será notificado." });
      await fetchMyRequests();
      setStep("search");
      setSelectedProgram(null);
    }
    setSubmitting(false);
  };

  const handleCreateProgram = async () => {
    if (!newProgramName.trim() || !newProgramInst.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("programs")
      .insert({
        name: newProgramName.trim(),
        institution: newProgramInst.trim(),
        area: newProgramArea.trim() || null,
        modality: newProgramModality.trim() || null,
        program_code: newProgramCode.trim() || null,
        created_by: user!.id,
        user_id: user!.id,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      // Add coordinator role if user doesn't have it
      await supabase.from("user_roles").upsert({
        user_id: user!.id,
        role: "coordinator",
      } as any, { onConflict: "user_id,role" }).select();

      // Also add researcher role
      await supabase.from("user_roles").upsert({
        user_id: user!.id,
        role: "researcher",
      } as any, { onConflict: "user_id,role" }).select();

      toast({ title: "Programa criado!", description: "Você é o coordenador deste programa." });
      navigate("/");
    }
    setSubmitting(false);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "approved": return "Aprovada";
      case "rejected": return "Negada";
      default: return "Pendente";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex items-center gap-3 py-4">
          <BookOpen className="h-7 w-7 text-accent" />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Lattes <span className="text-accent">Reader</span>
          </h1>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => navigate("/")}>
            Ir ao painel
          </Button>
        </div>
      </header>

      <main className="container py-8 max-w-xl space-y-6">
        {/* My requests */}
        {myRequests.length > 0 && (
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Minhas solicitações
            </h3>
            <div className="space-y-2">
              {myRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-3 p-3 rounded-md border bg-background">
                  {statusIcon(req.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {req.programs?.name || "Programa"} — {req.programs?.institution || ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {req.requested_role === "researcher" ? "Docente" : "Colaborador"} • {new Date(req.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant={req.status === "approved" ? "default" : req.status === "rejected" ? "destructive" : "secondary"}>
                    {statusLabel(req.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step: Search */}
        {step === "search" && (
          <div className="rounded-lg border bg-card p-6 space-y-5">
            <div className="text-center space-y-2">
              <GraduationCap className="h-10 w-10 text-accent mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Encontre seu programa</h2>
              <p className="text-sm text-muted-foreground">Busque pelo nome do programa ou instituição</p>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Ex: Ciência da Computação, UFMG..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{searchResults.length} programa(s) encontrado(s)</p>
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProgram(p)}
                    className="w-full text-left p-3 rounded-md border hover:border-accent hover:bg-accent/5 transition-colors"
                  >
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.institution}{p.area ? ` • ${p.area}` : ""}</p>
                  </button>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !searching && (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-muted-foreground">Nenhum programa encontrado.</p>
                <Button variant="outline" onClick={() => setStep("create-program")}>
                  <Plus className="h-4 w-4 mr-1" /> Criar novo programa
                </Button>
              </div>
            )}

            <div className="pt-2 border-t">
              <Button variant="ghost" className="w-full" onClick={() => setStep("create-program")}>
                <Plus className="h-4 w-4 mr-1" /> Não encontrou? Crie um novo programa
              </Button>
            </div>
          </div>
        )}

        {/* Step: Choose role */}
        {step === "choose-role" && selectedProgram && (
          <div className="rounded-lg border bg-card p-6 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-foreground">{selectedProgram.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedProgram.institution}</p>
            </div>

            <p className="text-sm text-center text-muted-foreground">Qual é sua relação com este programa?</p>

            <div className="grid gap-3">
              <button
                onClick={() => setStep("docente-form")}
                className="p-4 rounded-lg border hover:border-accent hover:bg-accent/5 transition-colors text-left space-y-1"
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-accent" />
                  <span className="font-semibold text-foreground">Sou docente do programa</span>
                </div>
                <p className="text-xs text-muted-foreground pl-7">Solicitar acesso como pesquisador/docente permanente</p>
              </button>

              <button
                onClick={() => {
                  setStep("docente-form");
                  // We'll use the form but with "viewer" role
                }}
                className="p-4 rounded-lg border hover:border-accent hover:bg-accent/5 transition-colors text-left space-y-1"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  <span className="font-semibold text-foreground">Solicitar acesso como colaborador</span>
                </div>
                <p className="text-xs text-muted-foreground pl-7">Acesso para visualização e colaboração</p>
              </button>
            </div>

            <Button variant="ghost" className="w-full" onClick={() => { setStep("search"); setSelectedProgram(null); }}>
              ← Voltar à busca
            </Button>
          </div>
        )}

        {/* Step: Docente form */}
        {step === "docente-form" && selectedProgram && (
          <div className="rounded-lg border bg-card p-6 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-foreground">Solicitar acesso</h2>
              <p className="text-sm text-muted-foreground">{selectedProgram.name} — {selectedProgram.institution}</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Nome completo *</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" className="mt-1" />
              </div>
              <div>
                <Label>Email institucional</Label>
                <Input value={institutionalEmail} onChange={(e) => setInstitutionalEmail(e.target.value)} placeholder="seu@universidade.edu.br" className="mt-1" />
              </div>
              <div>
                <Label>Link do currículo Lattes</Label>
                <Input value={lattesUrl} onChange={(e) => setLattesUrl(e.target.value)} placeholder="http://lattes.cnpq.br/..." className="mt-1" />
              </div>
              <div>
                <Label>Mensagem (opcional)</Label>
                <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Informações adicionais..." className="mt-1" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSubmitDocenteRequest} disabled={submitting || !fullName.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Enviar solicitação
              </Button>
              <Button variant="ghost" onClick={() => setStep("choose-role")}>Voltar</Button>
            </div>
          </div>
        )}

        {/* Step: Create program */}
        {step === "create-program" && (
          <div className="rounded-lg border bg-card p-6 space-y-5">
            <div className="text-center space-y-2">
              <Plus className="h-10 w-10 text-accent mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Criar programa</h2>
              <p className="text-sm text-muted-foreground">Você será o coordenador deste programa</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Nome do programa *</Label>
                <Input value={newProgramName} onChange={(e) => setNewProgramName(e.target.value)} placeholder="Ex: Programa de Pós-Graduação em..." className="mt-1" />
              </div>
              <div>
                <Label>Instituição *</Label>
                <Input value={newProgramInst} onChange={(e) => setNewProgramInst(e.target.value)} placeholder="Ex: UFMG" className="mt-1" />
              </div>
              <div>
                <Label>Área de avaliação</Label>
                <Input value={newProgramArea} onChange={(e) => setNewProgramArea(e.target.value)} placeholder="Ex: Ciência da Computação" className="mt-1" />
              </div>
              <div>
                <Label>Modalidade</Label>
                <Input value={newProgramModality} onChange={(e) => setNewProgramModality(e.target.value)} placeholder="Acadêmico ou Profissional" className="mt-1" />
              </div>
              <div>
                <Label>Código do programa</Label>
                <Input value={newProgramCode} onChange={(e) => setNewProgramCode(e.target.value)} placeholder="Ex: 42001013049P5" className="mt-1" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCreateProgram} disabled={submitting || !newProgramName.trim() || !newProgramInst.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Criar programa
              </Button>
              <Button variant="ghost" onClick={() => setStep("search")}>Voltar</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Onboarding;
