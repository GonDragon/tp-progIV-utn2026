import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { SupabaseService } from './supabase';
import { environment } from '../../environments/environment';

export interface PushNotificationPayload {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  tag?: string;
  url?: string;
  perfil_id?: string;
  perfil_ids?: string[];
  broadcast?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private readonly supabase = inject(SupabaseService);
  private readonly swPush = inject(SwPush, { optional: true });

  readonly vapidPublicKey = (environment as any).vapidPublicKey || '';
  private pendingPermissionPromise: Promise<boolean> | null = null;

  /**
   * Verifica si las notificaciones y el Service Worker son soportados por el navegador
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  /**
   * Obtiene el estado actual del permiso de notificaciones
   */
  getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  /**
   * Solicita o revisa los permisos del navegador e inicializa la suscripción push
   * esperando la respuesta del usuario (aceptar o denegar) en el popup del navegador.
   */
  async requestPermissionAndSubscribe(perfilId?: string): Promise<boolean> {
    if (this.pendingPermissionPromise) {
      return this.pendingPermissionPromise;
    }

    this.pendingPermissionPromise = this.executeRequestPermissionAndSubscribe(perfilId).finally(() => {
      this.pendingPermissionPromise = null;
    });

    return this.pendingPermissionPromise;
  }

  private async executeRequestPermissionAndSubscribe(perfilId?: string): Promise<boolean> {
    if (!this.isSupported()) {
      console.error(
        '[PushNotificationService] Push notifications no son soportadas en este navegador o entorno (falta Window, Notification, ServiceWorker o PushManager).'
      );
      return false;
    }

    try {
      let permission = Notification.permission;

      if (permission === 'denied') {
        console.error(
          '[PushNotificationService] Permiso de notificaciones push fue denegado por el usuario o navegador.'
        );
        return false;
      }

      if (permission === 'default') {
        permission = await new Promise<NotificationPermission>((resolve) => {
          try {
            const req = Notification.requestPermission((result) => {
              resolve(result);
            });
            if (req && typeof (req as any).then === 'function') {
              (req as Promise<NotificationPermission>)
                .then(resolve)
                .catch(() => resolve(Notification.permission));
            }
          } catch {
            resolve(Notification.permission);
          }
        });
      }

      if (permission === 'granted') {
        const subscription = await this.subscribeToPush(perfilId);
        if (!subscription) {
          console.error(
            '[PushNotificationService] No se pudo completar la suscripción push tras obtener permisos (PushSubscription resultó NULL).'
          );
          return false;
        }
        return true;
      }

      console.error(
        `[PushNotificationService] Permiso de notificaciones push no concedido. Estado actual: ${permission}`
      );
      return false;
    } catch (error) {
      console.error(
        '[PushNotificationService] Error al solicitar permiso o suscribir a notificaciones push:',
        error
      );
      return false;
    }
  }

  /**
   * Realiza la suscripción push mediante SwPush o el PushManager nativo del Service Worker
   */
  async subscribeToPush(perfilId?: string): Promise<PushSubscription | null> {
    if (!this.vapidPublicKey) {
      console.error(
        '[PushNotificationService] No se puede suscribir: la clave pública VAPID (vapidPublicKey) no está configurada o es vacía en el archivo de entorno.'
      );
      return null;
    }

    try {
      let subscription: PushSubscription | null = null;

      if (this.swPush && this.swPush.isEnabled) {
        try {
          subscription = await this.swPush.requestSubscription({
            serverPublicKey: this.vapidPublicKey,
          });
        } catch (swPushErr) {
          console.error(
            '[PushNotificationService] Error al solicitar suscripción mediante SwPush, intentando vía Service Worker nativo:',
            swPushErr
          );
        }
      }

      if (!subscription && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (!registration) {
          console.error(
            '[PushNotificationService] ServiceWorkerRegistration no está listo o es NULL.'
          );
          return null;
        }

        if (!registration.pushManager) {
          console.error(
            '[PushNotificationService] registration.pushManager no está disponible en este Service Worker.'
          );
          return null;
        }

        const convertedVapidKey = this.urlB64ToUint8Array(this.vapidPublicKey);
        if (!convertedVapidKey || convertedVapidKey.length === 0) {
          console.error(
            '[PushNotificationService] Error al convertir la clave pública VAPID a Uint8Array (clave inválida o corrupta).'
          );
          return null;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as any,
        });
      }

      if (subscription) {
        await this.saveSubscriptionToDatabase(subscription, perfilId);
        return subscription;
      }

      console.error(
        '[PushNotificationService] No se pudo generar la suscripción push (PushSubscription es NULL tras evaluar SwPush y PushManager).'
      );
      return null;
    } catch (error) {
      console.error(
        '[PushNotificationService] Error inesperado al completar la suscripción push:',
        error
      );
      return null;
    }
  }

  /**
   * Guarda o actualiza la suscripción en la tabla `push_subscriptions` de Supabase
   */
  async saveSubscriptionToDatabase(
    subscription: PushSubscription,
    perfilId?: string
  ): Promise<void> {
    try {
      if (!subscription) {
        console.error(
          '[PushNotificationService] Intento de guardar una suscripción push NULL en la base de datos.'
        );
        return;
      }

      const subJson = subscription.toJSON();
      const endpoint = subJson.endpoint;
      const p256dh = subJson.keys?.['p256dh'];
      const auth = subJson.keys?.['auth'];

      if (!endpoint || !p256dh || !auth) {
        console.error(
          '[PushNotificationService] Datos de suscripción push incompletos o NULL generados por el navegador:',
          { endpoint: !!endpoint, p256dh: !!p256dh, auth: !!auth, subJson }
        );
        return;
      }

      const payload: {
        endpoint: string;
        p256dh: string;
        auth: string;
        perfil_id?: string;
        updated_at: string;
      } = {
        endpoint,
        p256dh,
        auth,
        updated_at: new Date().toISOString(),
      };

      if (perfilId) {
        payload.perfil_id = perfilId;
      }

      const { error } = await this.supabase.client
        .from('push_subscriptions')
        .upsert(payload, { onConflict: 'endpoint' });

      if (error) {
        console.error(
          '[PushNotificationService] Error al persistir la suscripción push en la tabla push_subscriptions de Supabase:',
          error
        );
      }
    } catch (error) {
      console.error(
        '[PushNotificationService] Error inesperado al guardar la suscripción push en la base de datos:',
        error
      );
    }
  }

  /**
   * Desuscribe al usuario actual y elimina su registro en la base de datos
   */
  async unsubscribe(perfilId?: string): Promise<boolean> {
    try {
      if (this.swPush && this.swPush.isEnabled) {
        try {
          await this.swPush.unsubscribe();
        } catch (swErr) {
          console.error(
            '[PushNotificationService] Error al desuscribir mediante SwPush:',
            swErr
          );
        }
      } else if (this.isSupported()) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            const endpoint = subscription.endpoint;
            await subscription.unsubscribe();
            const { error } = await this.supabase.client
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', endpoint);

            if (error) {
              console.error(
                '[PushNotificationService] Error al eliminar suscripción por endpoint en Supabase:',
                error
              );
            }
          }
        } catch (regErr) {
          console.error(
            '[PushNotificationService] Error al desuscribir del PushManager:',
            regErr
          );
        }
      }

      if (perfilId) {
        const { error } = await this.supabase.client
          .from('push_subscriptions')
          .delete()
          .eq('perfil_id', perfilId);

        if (error) {
          console.error(
            '[PushNotificationService] Error al eliminar suscripción por perfil_id en Supabase:',
            error
          );
        }
      }

      return true;
    } catch (error) {
      console.error(
        '[PushNotificationService] Error al desuscribir de notificaciones push:',
        error
      );
      return false;
    }
  }

  /**
   * Envía una notificación push invocando la Supabase Edge Function 'send-push-notification'
   */
  async sendPushNotification(payload: PushNotificationPayload): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    if (!payload || !payload.title) {
      const errMsg = 'El payload o el título de la notificación push es obligatorio y no fue provisto.';
      console.error('[PushNotificationService] ' + errMsg, payload);
      return { success: false, error: errMsg };
    }

    try {
      const { data, error } = await this.supabase.client.functions.invoke(
        'send-push-notification',
        {
          body: {
            perfil_id: payload.perfil_id,
            perfil_ids: payload.perfil_ids,
            broadcast: payload.broadcast,
            notification: {
              title: payload.title,
              body: payload.body || '',
              icon: payload.icon || '/icons/icon-192x192.png',
              badge: payload.badge || '/icons/icon-72x72.png',
              data: payload.data,
              tag: payload.tag,
              url: payload.url || '/',
            },
          },
        }
      );

      if (error) {
        console.error(
          '[PushNotificationService] Error al invocar la Edge Function "send-push-notification":',
          error
        );
        return { success: false, error: error.message };
      }

      if (data?.error) {
        console.error(
          '[PushNotificationService] La Edge Function "send-push-notification" retornó un error:',
          data.error,
          data
        );
        return { success: false, error: data.error, data };
      }

      if (data?.success === false) {
        console.error(
          '[PushNotificationService] La Edge Function reportó que el envío no fue exitoso:',
          data
        );
        return { success: false, error: data.error || 'Fallo en el envío de notificación', data };
      }

      if (data?.sentCount === 0 || data?.total === 0) {
        console.error(
          '[PushNotificationService] No se enviaron notificaciones push (no se encontraron destinatarios o suscripciones activas):',
          data
        );
        return {
          success: false,
          error: data.message || data.error || 'No se encontraron destinatarios activos',
          data,
        };
      }

      if (data?.failed > 0) {
        console.error(
          `[PushNotificationService] Fallaron ${data.failed} de ${data.total} envíos de notificaciones push:`,
          data.errors || data
        );
      }

      return { success: true, data };
    } catch (err: any) {
      console.error(
        '[PushNotificationService] Error inesperado al invocar Edge Function para push notification:',
        err
      );
      return {
        success: false,
        error: err.message || 'Error al invocar edge function',
      };
    }
  }

  /**
   * Helper para enviar una notificación a un usuario específico
   */
  async sendToUser(
    perfilId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.sendPushNotification({
      perfil_id: perfilId,
      title,
      body,
      data,
    });
  }

  /**
   * Helper para enviar una notificación masiva (broadcast) a todos los usuarios
   */
  async sendBroadcast(
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.sendPushNotification({
      broadcast: true,
      title,
      body,
      data,
    });
  }

  /**
   * Convierte una clave VAPID en Base64 URL safe a Uint8Array para PushManager
   */
  private urlB64ToUint8Array(base64String: string): Uint8Array {
    try {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const buffer = new ArrayBuffer(rawData.length);
      const outputArray = new Uint8Array(buffer);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    } catch (err) {
      console.error(
        '[PushNotificationService] Error al decodificar la clave base64 VAPID:',
        err
      );
      return new Uint8Array(0);
    }
  }
}
