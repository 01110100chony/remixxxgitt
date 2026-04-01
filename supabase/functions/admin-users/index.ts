import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const method = req.method;

    if (method === "GET") {
      // List all users with their profiles and roles
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;

      const { data: allRoles } = await supabase.from("user_roles").select("*");
      const { data: profiles } = await supabase.from("profiles").select("*");

      const enriched = users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        display_name: profiles?.find((p) => p.user_id === u.id)?.display_name || u.email,
        roles: allRoles?.filter((r) => r.user_id === u.id).map((r) => r.role) || [],
      }));

      return new Response(JSON.stringify(enriched), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "POST") {
      const body = await req.json();
      const { action, target_user_id, role } = body;

      if (action === "add_role") {
        const { error } = await supabase.from("user_roles").insert({
          user_id: target_user_id,
          role,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "remove_role") {
        const { error } = await supabase.from("user_roles").delete()
          .eq("user_id", target_user_id)
          .eq("role", role);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "delete_user") {
        const { error } = await supabase.auth.admin.deleteUser(target_user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "invite_user") {
        const { email, invite_role } = body;
        if (!email) throw new Error("Email is required");
        const { data: inviteData, error } = await supabase.auth.admin.inviteUserByEmail(email);
        if (error) throw error;
        // Assign role if specified
        if (invite_role && inviteData?.user?.id) {
          await supabase.from("user_roles").upsert({
            user_id: inviteData.user.id,
            role: invite_role,
          }, { onConflict: "user_id,role" });
        }
        return new Response(JSON.stringify({ success: true, user_id: inviteData?.user?.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
