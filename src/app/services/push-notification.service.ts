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
   * minimizando la interacción con el usuario (sin modales ni interfaces invasivas).
   */
  async requestPermissionAndSubscribe(perfilId?: string): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Push notifications no son soportadas en este navegador o entorno.');
      return false;
    }

    try {
      let permission = Notification.permission;

      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        await this.subscribeToPush(perfilId);
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Error al solicitar permiso o suscribir a notificaciones push:', error);
      return false;
    }
  }

  /**
   * Realiza la suscripción push mediante SwPush o el PushManager nativo del Service Worker
   */
  async subscribeToPush(perfilId?: string): Promise<PushSubscription | null> {

    try {
      let subscription: PushSubscription | null = null;

      if (this.swPush && this.swPush.isEnabled && this.vapidPublicKey) {
        subscription = await this.swPush.requestSubscription({
          serverPublicKey: this.vapidPublicKey,
        });
      } else if ('serviceWorker' in navigator && this.vapidPublicKey) {
        const registration = await navigator.serviceWorker.ready;
        const convertedVapidKey = this.urlB64ToUint8Array(this.vapidPublicKey);

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as any,
        });
      }

      if (subscription) {
        await this.saveSubscriptionToDatabase(subscription, perfilId);
        return subscription;
      }

      return null;
    } catch (error) {
      console.warn('No se pudo completar la suscripción push:', error);
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
      const subJson = subscription.toJSON();
      const endpoint = subJson.endpoint;
      const p256dh = subJson.keys?.['p256dh'];
      const auth = subJson.keys?.['auth'];

      if (!endpoint || !p256dh || !auth) {
        console.warn('Datos de suscripción incompletos.');
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
        console.warn('Error al persistir la suscripción push en Supabase:', error);
      }
    } catch (error) {
      console.warn('Error al guardar suscripción push en base de datos:', error);
    }
  }

  /**
   * Desuscribe al usuario actual y elimina su registro en la base de datos
   */
  async unsubscribe(perfilId?: string): Promise<boolean> {
    try {
      if (this.swPush && this.swPush.isEnabled) {
        await this.swPush.unsubscribe();
      } else if (this.isSupported()) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          await this.supabase.client
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint);
        }
      }

      if (perfilId) {
        await this.supabase.client
          .from('push_subscriptions')
          .delete()
          .eq('perfil_id', perfilId);
      }

      return true;
    } catch (error) {
      console.warn('Error al desuscribir de notificaciones push:', error);
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
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al invocar edge function' };
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
  }
}
