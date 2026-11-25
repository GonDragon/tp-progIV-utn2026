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

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    }

    const body: RequestBody = await req.json();
    const { perfil_id, perfil_ids, broadcast, subscription, notification } = body;

    if (!notification || !notification.title) {
      return new Response(
        JSON.stringify({ error: "El campo 'notification' con al menos 'title' es obligatorio." }),
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
      subscriptionsToSend.push(subscription);
    } else if (broadcast) {
      const { data, error } = await supabase.from("push_subscriptions").select("*");
      if (error) throw error;
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
      if (error) throw error;
      subscriptionsToSend = (data || []).map((sub: any) => ({
        id: sub.id,
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }));
    }

    if (subscriptionsToSend.length === 0) {
      return new Response(
        JSON.stringify({ message: "No se encontraron destinatarios/suscripciones activas.", sentCount: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          // If subscription has expired or is invalid (410 Gone / 404 Not Found), delete from DB
          if (sub.id && (pushErr.statusCode === 410 || pushErr.statusCode === 404)) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
          throw pushErr;
        }
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({
        success: true,
        total: subscriptionsToSend.length,
        successful,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Error al procesar la notificación push" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
