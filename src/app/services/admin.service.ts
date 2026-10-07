import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from './auth';
import { MovieService } from './movie.service';
import { CandyService } from './candy.service';
import { CouponService } from './coupon.service';
import { ReportsService } from './reports.service';
import { AuditService } from './audit.service';
import { TicketService } from './ticket.service';
import {
  CandyProduct,
  SpecialCombo,
  DiscountCoupon,
  LoyaltyReward,
  AuditLogEntry,
  ValidatableTicket,
  DailyReportItem,
  MovieViewStat
} from '../models/admin';
import { Movie, Schedule } from '../models/movie';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly authService = inject(AuthService);
  private readonly movieService = inject(MovieService);
  private readonly candyService = inject(CandyService);
  private readonly couponService = inject(CouponService);
  private readonly reportsService = inject(ReportsService);
  readonly ticketService = inject(TicketService);
  readonly auditService = inject(AuditService);

  // Available Rooms in the Cinema
  readonly availableRooms = [
    'Sala 1 (Principal)',
    'Sala 2 (3D Digital)',
    'Sala 3 (Confort)',
    'Sala 4 (4D Experience)',
    'Sala 5 (Familiar)',
    'Sala 6 (Ultra Sound)',
    'Sala IMAX'
  ];

  // Candy Bar Catalog (Synced live with CandyService and Supabase)
  readonly candyProducts = computed<CandyProduct[]>(() => {
    return this.candyService.products().map(p => ({
      id: String(p.id),
      name: p.nombre,
      category: p.categoria as any,
      price: p.precio,
      pointsCost: p.costo_puntos,
      description: `${p.categoria} - ${p.nombre}`,
      placeholderColor: '#f59e0b',
      isAvailable: true,
      salesCount: 0
    }));
  });

  // Special Combos (Synced live with CandyService and Supabase)
  readonly specialCombos = computed<SpecialCombo[]>(() => {
    return this.candyService.combos().map(c => ({
      id: String(c.id),
      name: c.nombre,
      description: `Combo especial ${c.nombre}`,
      ticketCount: 1,
      includedItems: [],
      fixedPrice: c.precio_fijo,
      isActive: true
    }));
  });

  // Discount Coupons & Promotions (Synced live with CouponService and Supabase)
  readonly discountCoupons = computed<DiscountCoupon[]>(() => {
    return this.couponService.coupons().map(c => {
      const isWelcome = c.tipo_restriccion.toLowerCase().includes('primera') || c.tipo_restriccion.toLowerCase().includes('bienvenida');
      const isSenior = c.tipo_restriccion.toLowerCase().includes('mayores') || c.tipo_restriccion.toLowerCase().includes('50');
      return {
        id: String(c.id),
        code: c.codigo,
        discountPercent: c.porcentaje_descuento,
        type: isWelcome ? 'primera_compra' : (isSenior ? 'mayores_50' : 'general'),
        minAge: isSenior ? 50 : undefined,
        isActive: true,
        description: isWelcome ? 'Descuento para nuevos usuarios en primera compra' : (isSenior ? 'Beneficio exclusivo mayores de 50 años' : `Restricción: ${c.tipo_restriccion}`),
        usageCount: 0
      };
    });
  });

  // Loyalty Rewards
  private readonly _loyaltyRewards = signal<LoyaltyReward[]>([
    {
      id: 'lr1',
      name: 'Entrada 2D Gratuita',
      type: 'ticket',
      pointsCost: 5000,
      description: 'Canjeable por 1 entrada en formato 2D para cualquier función de lunes a jueves.',
      isActive: true
    },
    {
      id: 'lr2',
      name: 'Entrada 3D / 4D Gratuita',
      type: 'ticket',
      pointsCost: 7500,
      description: 'Canjeable por 1 entrada para formatos especiales (3D, 4D o Sala IMAX).',
      isActive: true
    },
    {
      id: 'lr3',
      name: 'Balde Pochoclos Grande de Regalo',
      type: 'candy',
      pointsCost: 4500,
      description: 'Canje de 1 balde de pochoclos gigante dulces o salados en el Candy Bar.',
      isActive: true
    },
    {
      id: 'lr4',
      name: 'Gaseosa Grande 750ml',
      type: 'candy',
      pointsCost: 2500,
      description: 'Canje de 1 bebida grande en cualquier mostrador.',
      isActive: true
    }
  ]);
  readonly loyaltyRewards = this._loyaltyRewards.asReadonly();

  // Audit Log (Synced live with Supabase via AuditService)
  readonly auditLogs = this.auditService.logs;

  // Tickets & Validation (Live from Supabase via TicketService)
  readonly currentTicket = this.ticketService.currentTicket;
  readonly isTicketLoading = this.ticketService.isLoading;
  readonly ticketError = this.ticketService.error;

  // Daily Reports & Movie Stats (Live from Supabase via ReportsService)
  get dailyReports(): DailyReportItem[] {
    return this.reportsService.dailyReports();
  }

  get movieStats(): MovieViewStat[] {
    return this.reportsService.movieStats();
  }

  // Log action helper (delegates to AuditService / Supabase log_actividad)
  addAuditLog(
    action: AuditLogEntry['action'],
    category: string,
    details: string
  ): void {
    this.auditService.log(action, category, details);
  }

  // --- AUTOMATIC ROOM ALLOCATION ALGORITHM ---
  // Requirements:
  // 1. Assign room automatically without schedule overlap.
  // 2. Minimum 30-minute buffer between screenings in the same room.
  allocateAutomaticRoom(
    timeString: string, // "HH:MM"
    durationMinutes: number
  ): { success: boolean; room?: string; reason?: string } {
    const [reqHours, reqMinutes] = timeString.split(':').map(Number);
    if (isNaN(reqHours) || isNaN(reqMinutes)) {
      return { success: false, reason: 'Formato de hora inválido' };
    }

    const proposedStart = reqHours * 60 + reqMinutes;
    const proposedEnd = proposedStart + durationMinutes;

    // Collect all existing schedules and their occupied intervals [start, end + 30] per room
    const movies = this.movieService.movies();
    const roomOccupancy: Record<string, { start: number; end: number; movieTitle: string }[]> = {};

    this.availableRooms.forEach(room => {
      roomOccupancy[room] = [];
    });

    movies.forEach(movie => {
      movie.schedules?.forEach(sched => {
        const [h, m] = sched.time.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          const sStart = h * 60 + m;
          const sEnd = sStart + movie.duration; // End of movie
          const sBufferedEnd = sEnd + 30; // 30-minute mandatory buffer

          // Normalise room name match
          const matchingRoom = this.availableRooms.find(r =>
            r.toLowerCase().includes(sched.room.toLowerCase()) || sched.room.toLowerCase().includes(r.toLowerCase())
          ) || sched.room;

          if (!roomOccupancy[matchingRoom]) {
            roomOccupancy[matchingRoom] = [];
          }
          roomOccupancy[matchingRoom].push({
            start: sStart,
            end: sBufferedEnd,
            movieTitle: movie.title
          });
        }
      });
    });

    // Check each room to find an available slot
    for (const room of this.availableRooms) {
      const busySlots = roomOccupancy[room] || [];
      let isRoomFree = true;

      for (const slot of busySlots) {
        // Overlap condition:
        // A conflict occurs if the proposed screening [proposedStart, proposedEnd + 30] overlaps with [slot.start, slot.end]
        const proposedBufferedEnd = proposedEnd + 30;
        const overlaps = Math.max(proposedStart, slot.start) < Math.min(proposedBufferedEnd, slot.end);

        if (overlaps) {
          isRoomFree = false;
          break;
        }
      }

      if (isRoomFree) {
        return {
          success: true,
          room
        };
      }
    }

    return {
      success: false,
      reason: 'No hay salas con el margen mínimo de 30 minutos disponible en ese horario.'
    };
  }

  // --- CANDY BAR ABM ---
  addCandyProduct(product: CandyProduct): void {
    this.candyService.createProduct({
      nombre: product.name || '',
      categoria: product.category || 'Pochoclos',
      precio: product.price || 0,
      costo_puntos: product.pointsCost || 0
    });
    this.addAuditLog('modificar_candy', 'Candy Bar', `Creó el producto "${product.name}" con precio $${product.price} y costo ${product.pointsCost} pts.`);
  }

  updateCandyProduct(product: CandyProduct): void {
    const id = Number(product.id);
    if (!isNaN(id)) {
      this.candyService.updateProduct(id, {
        nombre: product.name || '',
        categoria: product.category || 'Pochoclos',
        precio: product.price || 0,
        costo_puntos: product.pointsCost || 0
      });
      this.addAuditLog('modificar_candy', 'Candy Bar', `Actualizó el producto "${product.name}".`);
    }
  }

  deleteCandyProduct(id: string): void {
    const numId = Number(id);
    if (!isNaN(numId)) {
      this.candyService.deleteProduct(numId);
      this.addAuditLog('modificar_candy', 'Candy Bar', `Eliminó el producto ID: ${id}`);
    }
  }

  // --- SPECIAL COMBOS ABM ---
  addSpecialCombo(combo: SpecialCombo): void {
    this.candyService.createCombo({
      nombre: combo.name || '',
      precio_fijo: combo.fixedPrice || 0
    });
    this.addAuditLog('modificar_candy', 'Combos Especiales', `Creó el combo "${combo.name}" a precio fijo $${combo.fixedPrice}.`);
  }

  updateSpecialCombo(combo: SpecialCombo): void {
    const id = Number(combo.id);
    if (!isNaN(id)) {
      this.candyService.updateCombo(id, {
        nombre: combo.name || '',
        precio_fijo: combo.fixedPrice || 0
      });
      this.addAuditLog('modificar_candy', 'Combos Especiales', `Actualizó combo "${combo.name}".`);
    }
  }

  deleteSpecialCombo(id: string): void {
    const numId = Number(id);
    if (!isNaN(numId)) {
      this.candyService.deleteCombo(numId);
      this.addAuditLog('modificar_candy', 'Combos Especiales', `Eliminó combo ID: ${id}`);
    }
  }

  // --- COUPONS ABM ---
  addCoupon(coupon: DiscountCoupon): void {
    const restriction = coupon.type === 'primera_compra'
      ? 'Primera Compra'
      : (coupon.type === 'mayores_50' ? 'Mayores 50' : 'Ninguna');
    this.couponService.createCoupon({
      codigo: coupon.code,
      porcentaje_descuento: coupon.discountPercent,
      tipo_restriccion: restriction
    });
  }

  updateCoupon(coupon: DiscountCoupon): void {
    const numId = Number(coupon.id);
    if (!isNaN(numId)) {
      const restriction = coupon.type === 'primera_compra'
        ? 'Primera Compra'
        : (coupon.type === 'mayores_50' ? 'Mayores 50' : 'Ninguna');
      this.couponService.updateCoupon(numId, {
        codigo: coupon.code,
        porcentaje_descuento: coupon.discountPercent,
        tipo_restriccion: restriction
      });
    }
  }

  deleteCoupon(id: string): void {
    const numId = Number(id);
    if (!isNaN(numId)) {
      this.couponService.deleteCoupon(numId);
    }
  }

  // Update Welcome coupon percentage
  updateWelcomeDiscountPercent(newPercent: number): void {
    this.couponService.setWelcomeDiscountPercent(newPercent);
  }

  // --- LOYALTY REWARDS ABM ---
  addLoyaltyReward(reward: LoyaltyReward): void {
    this._loyaltyRewards.update(curr => [reward, ...curr]);
    this.addAuditLog('modificar_precio', 'Fidelización', `Creó recompensa de puntos "${reward.name}" (${reward.pointsCost} pts).`);
  }

  updateLoyaltyReward(reward: LoyaltyReward): void {
    this._loyaltyRewards.update(curr =>
      curr.map(r => r.id === reward.id ? { ...r, ...reward } : r)
    );
    this.addAuditLog('modificar_precio', 'Fidelización', `Actualizó recompensa "${reward.name}" a ${reward.pointsCost} pts.`);
  }

  deleteLoyaltyReward(id: string): void {
    this._loyaltyRewards.update(curr => curr.filter(r => r.id !== id));
  }

  // --- QR / TICKET VALIDATION ---
  async validateTicketByCode(codeToValidate: string) {
    return this.ticketService.getTicketByQrCode(codeToValidate);
  }

  async useTicket(ticketId: number) {
    return this.ticketService.useTicket(ticketId);
  }

  clearCurrentTicket(): void {
    this.ticketService.clearCurrentTicket();
  }

  // --- EXPORT DAILY REPORTS ---
  exportDailyReportToCsv(): void {
    this.reportsService.exportDailyReportToCsv();
  }

  exportDailyReportToExcel(): void {
    this.reportsService.exportDailyReportToExcel();
  }

  printOrDownloadPdf(): void {
    this.reportsService.printOrDownloadPdf();
  }
}
