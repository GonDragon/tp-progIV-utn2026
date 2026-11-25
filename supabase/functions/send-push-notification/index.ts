import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  tag?: string;
  url?: string;
}

interface RequestBody {
  perfil_id?: string;
  perfil_ids?: string[];
  broadcast?: boolean;
  subscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  notification: PushPayload;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@cine.com";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error(
        "[Edge Function] Faltan variables de entorno requeridas de Supabase (SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY)."
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Variables de entorno de Supabase no configuradas en Edge Function.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error(
        "[Edge Function] Faltan variables de entorno requeridas de VAPID (VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY)."
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Variables de entorno VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY no configuradas en Edge Function.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    } catch (vapidErr: any) {
      console.error("[Edge Function] Error al configurar VAPID details:", vapidErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error al configurar credenciales VAPID en Edge Function: " + (vapidErr?.message || vapidErr),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch (parseErr: any) {
      console.error("[Edge Function] Error al parsear JSON del cuerpo de la petición:", parseErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cuerpo de petición no es un JSON válido: " + parseErr?.message,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { perfil_id, perfil_ids, broadcast, subscription, notification } = body;

    if (!notification || !notification.title) {
      console.error("[Edge Function] Campo 'notification' o 'notification.title' faltante o inválido:", body);
      return new Response(
        JSON.stringify({
          success: false,
          error: "El campo 'notification' con al menos 'title' es obligatorio y no fue provisto o es NULL.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payloadString = JSON.stringify({
      notification: {
        title: notification.title,
        body: notification.body || "",
        icon: notification.icon || "/icons/icon-192x192.png",
        badge: notification.badge || "/icons/icon-72x72.png",
        data: {
          url: notification.url || "/",
          ...(notification.data || {}),
        },
        tag: notification.tag,
      },
    });

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    let subscriptionsToSend: Array<{
      id?: number;
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }> = [];

    if (subscription) {
      if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
        console.error("[Edge Function] La suscripción enviada contiene campos NULL o incompletos:", subscription);
        return new Response(
          JSON.stringify({
            success: false,
            error: "La suscripción provista contiene campos nulos o incompletos (endpoint, p256dh o auth).",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      subscriptionsToSend.push(subscription);
    } else if (broadcast) {
      const { data, error } = await supabase.from("push_subscriptions").select("*");
      if (error) {
        console.error("[Edge Function] Error al consultar todas las suscripciones (broadcast):", error);
        throw error;
      }
      subscriptionsToSend = (data || []).map((sub: any) => ({
        id: sub.id,
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }));
    } else if (perfil_id || (perfil_ids && perfil_ids.length > 0)) {
      let query = supabase.from("push_subscriptions").select("*");
      if (perfil_id) {
        query = query.eq("perfil_id", perfil_id);
      } else if (perfil_ids && perfil_ids.length > 0) {
        query = query.in("perfil_id", perfil_ids);
      }
      const { data, error } = await query;
      if (error) {
        console.error("[Edge Function] Error al consultar suscripciones por perfil:", error);
        throw error;
      }
      subscriptionsToSend = (data || []).map((sub: any) => ({
        id: sub.id,
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }));
    } else {
      console.error(
        "[Edge Function] No se especificó ningún destinatario (perfil_id, perfil_ids, broadcast o subscription)."
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "No se especificó destinatario (perfil_id, perfil_ids, broadcast ni subscription provistos).",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (subscriptionsToSend.length === 0) {
      console.error(
        "[Edge Function] No se encontraron suscripciones push activas en la base de datos para los destinatarios solicitados:",
        { perfil_id, perfil_ids, broadcast }
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "No se encontraron destinatarios o suscripciones activas en la base de datos.",
          message: "No se encontraron destinatarios/suscripciones activas.",
          sentCount: 0,
          total: 0,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await Promise.allSettled(
      subscriptionsToSend.map(async (sub) => {
        try {
          return await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payloadString
          );
        } catch (pushErr: any) {
          // Si la suscripción expiró o ya no es válida (410 Gone / 404 Not Found), eliminarla de la BD
          if (sub.id && (pushErr.statusCode === 410 || pushErr.statusCode === 404)) {
            console.warn(
              `[Edge Function] Eliminando suscripción push caducada ID ${sub.id} (status: ${pushErr.statusCode})`
            );
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
          throw pushErr;
        }
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failedResults = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    const failed = failedResults.length;
    const errorDetails = failedResults.map((r) => {
      const err = r.reason;
      return {
        message: err?.message || String(err),
        statusCode: err?.statusCode,
        body: err?.body,
      };
    });

    if (failed > 0) {
      console.error(
        `[Edge Function] Ocurrieron ${failed} fallos de ${subscriptionsToSend.length} notificaciones enviadas:`,
        errorDetails
      );
    }

    if (successful === 0 && failed > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Falló el envío de todas las notificaciones push.",
          total: subscriptionsToSend.length,
          successful: 0,
          failed,
          errors: errorDetails,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: failed === 0,
        total: subscriptionsToSend.length,
        successful,
        failed,
        errors: errorDetails.length > 0 ? errorDetails : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Edge Function] Error no controlado al procesar la notificación push:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Error al procesar la notificación push",
        stack: error.stack,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
