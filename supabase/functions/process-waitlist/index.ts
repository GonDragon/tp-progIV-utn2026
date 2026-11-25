import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  funcion_id?: number;
  action?: "process_seat_freed" | "check_expired";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Variables de entorno de Supabase no configuradas en Edge Function.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    let body: RequestBody = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const { funcion_id, action = "process_seat_freed" } = body;
    const nowIso = new Date().toISOString();

    if (funcion_id) {
      // 1. Expire outdated notifications for this function
      await supabase
        .from("lista_espera")
        .update({ estado: "expirado" })
        .eq("funcion_id", funcion_id)
        .eq("estado", "notificado")
        .lt("expira_en", nowIso);

      // 2. Check if an active notification is in progress
      const { data: activeNotified } = await supabase
        .from("lista_espera")
        .select("id, perfil_id, expira_en")
        .eq("funcion_id", funcion_id)
        .eq("estado", "notificado")
        .gte("expira_en", nowIso)
        .maybeSingle();

      if (activeNotified) {
        return new Response(
          JSON.stringify({
            success: true,
            action: "notificado_activo",
            message: "Existe un usuario con notificación activa vigente (ventana de 15 minutos).",
            data: activeNotified,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Get next in line
      const { data: nextInLine } = await supabase
        .from("lista_espera")
        .select(`
          id,
          perfil_id,
          perfiles:perfil_id (
            id,
            nombre,
            apellido,
            email
          ),
          funciones:funcion_id (
            id,
            fecha_hora_inicio,
            peliculas:pelicula_id (
              nombre
            )
          )
        `)
        .eq("funcion_id", funcion_id)
        .eq("estado", "en_espera")
        .order("fecha_inscripcion", { ascending: true })
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!nextInLine) {
        return new Response(
          JSON.stringify({
            success: true,
            action: "sin_espera",
            message: "No hay usuarios en lista de espera para esta función.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 4. Update next in line with 15-minute expiration
      const expiraEn = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await supabase
        .from("lista_espera")
        .update({
          estado: "notificado",
          notificado_en: nowIso,
          expira_en: expiraEn,
        })
        .eq("id", nextInLine.id);

      const perfil = Array.isArray(nextInLine.perfiles) ? nextInLine.perfiles[0] : nextInLine.perfiles;
      const funcion = Array.isArray(nextInLine.funciones) ? nextInLine.funciones[0] : nextInLine.funciones;
      const pelicula = funcion?.peliculas ? (Array.isArray(funcion.peliculas) ? funcion.peliculas[0] : funcion.peliculas) : null;
      const movieTitle = pelicula?.nombre || "Película";

      // 5. Send push notification invoking send-push-notification internally
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            perfil_id: nextInLine.perfil_id,
            notification: {
              title: "🎟️ ¡Se liberó una butaca!",
              body: `Se liberaron entradas para "${movieTitle}". Tienes 15 minutos para completar tu compra antes de pasar al siguiente en la lista.`,
              icon: "/icons/icon-192x192.png",
              badge: "/icons/icon-72x72.png",
              url: "/perfil",
              data: {
                funcion_id,
                type: "waitlist_freed",
              },
            },
          },
        });
      } catch (pushErr) {
        console.error("Error al invocar send-push-notification desde Edge Function:", pushErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: "nuevo_notificado",
          notified: {
            id: nextInLine.id,
            perfil_id: nextInLine.perfil_id,
            nombre: perfil ? `${perfil.nombre || ""} ${perfil.apellido || ""}`.trim() : "Usuario",
            email: perfil?.email,
            pelicula: movieTitle,
            expira_en: expiraEn,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Global expiration sweep across all functions
    const { data: expiredList } = await supabase
      .from("lista_espera")
      .select("id, funcion_id")
      .eq("estado", "notificado")
      .lt("expira_en", nowIso);

    if (expiredList && expiredList.length > 0) {
      await supabase
        .from("lista_espera")
        .update({ estado: "expirado" })
        .in("id", expiredList.map((e) => e.id));
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: "check_expired",
        expired_count: expiredList?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Error al procesar lista de espera",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
