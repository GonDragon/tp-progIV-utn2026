import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from './auth';
import { MovieService } from './movie.service';
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

  // Candy Bar Catalog
  private readonly _candyProducts = signal<CandyProduct[]>([
    {
      id: 'cp1',
      name: 'Balde Pochoclos Gigante (Dulces)',
      category: 'Pochoclos',
      price: 5200,
      pointsCost: 4500,
      description: 'Balde extragrande con pochoclos caramelizados recién preparados.',
      placeholderColor: '#f59e0b',
      isAvailable: true,
      salesCount: 1420
    },
    {
      id: 'cp2',
      name: 'Balde Pochoclos Mediano (Salados)',
      category: 'Pochoclos',
      price: 4100,
      pointsCost: 3600,
      description: 'Balde mediano clásico con manteca y sal.',
      placeholderColor: '#d97706',
      isAvailable: true,
      salesCount: 980
    },
    {
      id: 'cp3',
      name: 'Gaseosa Grande 750ml',
      category: 'Bebidas',
      price: 2800,
      pointsCost: 2500,
      description: 'Vaso grande de gaseosa línea Coca-Cola bien fría.',
      placeholderColor: '#dc2626',
      isAvailable: true,
      salesCount: 2150
    },
    {
      id: 'cp4',
      name: 'Agua Mineral 500ml',
      category: 'Bebidas',
      price: 1900,
      pointsCost: 1600,
      description: 'Agua mineral natural sin gas o con gas.',
      placeholderColor: '#0284c7',
      isAvailable: true,
      salesCount: 650
    },
    {
      id: 'cp5',
      name: 'Nachos con Queso Cheddar Caliente',
      category: 'Snacks',
      price: 4600,
      pointsCost: 4000,
      description: 'Crujientes totopos de maíz acompañados de salsa cheddar caliente.',
      placeholderColor: '#ca8a04',
      isAvailable: true,
      salesCount: 890
    },
    {
      id: 'cp6',
      name: 'Chocolates & Caramelos Mix',
      category: 'Dulces',
      price: 2400,
      pointsCost: 2000,
      description: 'Paquete de confites de chocolate crocantes.',
      placeholderColor: '#7c2d12',
      isAvailable: true,
      salesCount: 520
    }
  ]);
  readonly candyProducts = this._candyProducts.asReadonly();

  // Special Combos (Tickets + Candy Bar)
  private readonly _specialCombos = signal<SpecialCombo[]>([
    {
      id: 'sc1',
      name: 'Combo Dúo Cinéfilo',
      description: '2 Entradas 2D/3D + 1 Balde Gigante de Pochoclos + 2 Gaseosas Grandes.',
      ticketCount: 2,
      includedItems: ['1x Balde Pochoclos Gigante', '2x Gaseosa Grande 750ml'],
      fixedPrice: 15900,
      pointsCost: 12000,
      isActive: true
    },
    {
      id: 'sc2',
      name: 'Combo Familiar Premium',
      description: '4 Entradas + 2 Baldes Medianos + 4 Bebidas + 1 Nachos Cheddar.',
      ticketCount: 4,
      includedItems: ['2x Balde Mediano', '4x Bebidas 750ml', '1x Nachos Cheddar'],
      fixedPrice: 28900,
      pointsCost: 22000,
      isActive: true
    },
    {
      id: 'sc3',
      name: 'Combo Solo Nachos & Movie',
      description: '1 Entrada + 1 Nachos Cheddar + 1 Gaseosa Grande.',
      ticketCount: 1,
      includedItems: ['1x Nachos Cheddar', '1x Gaseosa Grande 750ml'],
      fixedPrice: 9400,
      pointsCost: 7500,
      isActive: true
    }
  ]);
  readonly specialCombos = this._specialCombos.asReadonly();

  // Discount Coupons & Promotions
  private readonly _discountCoupons = signal<DiscountCoupon[]>([
    {
      id: 'dc1',
      code: 'BIENVENIDA20',
      discountPercent: 20,
      type: 'primera_compra',
      isActive: true,
      description: 'Descuento automático asignado a nuevos usuarios en su primera compra',
      usageCount: 314
    },
    {
      id: 'dc2',
      code: 'SENIOR50PLUS',
      discountPercent: 35,
      type: 'mayores_50',
      minAge: 50,
      isActive: true,
      description: 'Beneficio exclusivo para usuarios mayores de 50 años verificado por fecha de nacimiento',
      usageCount: 142
    },
    {
      id: 'dc3',
      code: 'MIERCOLESDEESTRENO',
      discountPercent: 25,
      type: 'general',
      isActive: true,
      description: 'Descuento general para funciones de mitad de semana',
      usageCount: 89
    }
  ]);
  readonly discountCoupons = this._discountCoupons.asReadonly();

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

  // Audit Log
  private readonly _auditLogs = signal<AuditLogEntry[]>([
    {
      id: 'log-101',
      timestamp: '2026-09-22 13:45:10',
      userId: '1',
      userName: 'Admin Adminincio',
      userRole: 'administrador',
      action: 'crear_funcion',
      category: 'Funciones',
      details: 'Programó función para "Duna: Odisea Espacial" en Sala IMAX a las 22:00 (4D - Subtitulada).'
    },
    {
      id: 'log-102',
      timestamp: '2026-09-22 12:30:22',
      userId: '1',
      userName: 'Admin Adminincio',
      userRole: 'administrador',
      action: 'modificar_precio',
      category: 'Candy Bar',
      details: 'Actualizó precio de "Balde Pochoclos Gigante" a $5.200 (antes $4.800).'
    },
    {
      id: 'log-103',
      timestamp: '2026-09-22 11:15:04',
      userId: '2',
      userName: 'Empleado Empleadinho',
      userRole: 'empleado',
      action: 'validar_qr',
      category: 'Control de Acceso',
      details: 'Validó código QR de boleto #TKT-89214 para Sala 1 (Butacas J4, J5).'
    },
    {
      id: 'log-104',
      timestamp: '2026-09-21 18:20:45',
      userId: '1',
      userName: 'Admin Adminincio',
      userRole: 'administrador',
      action: 'crear_cupon',
      category: 'Promociones',
      details: 'Creó cupón "SENIOR50PLUS" con 35% de descuento para clientes >50 años.'
    }
  ]);
  readonly auditLogs = this._auditLogs.asReadonly();

  // Validatable Tickets database
  private readonly _tickets = signal<ValidatableTicket[]>([
    {
      id: 't1',
      code: 'TKT-89214',
      movieTitle: 'Duna: Odisea Espacial',
      scheduleTime: '15:30 (Sala 1)',
      room: 'Sala 1 (Principal)',
      format: '2D Castellano',
      seats: ['J-4', 'J-5'],
      candyItems: ['1x Balde Pochoclos Gigante', '2x Gaseosa Grande 750ml'],
      customerName: 'Juan Carlos Pérez',
      customerEmail: 'juan.perez@example.com',
      purchaseDate: '2026-09-22 10:14',
      totalPaid: 15900,
      status: 'valida'
    },
    {
      id: 't2',
      code: 'TKT-34901',
      movieTitle: 'Guardianes del Abismo',
      scheduleTime: '19:15 (Sala 1)',
      room: 'Sala 1 (Principal)',
      format: '3D Subtitulada',
      seats: ['R-10', 'R-11 (VIP)'],
      candyItems: ['1x Nachos Cheddar'],
      customerName: 'María Elena Gomez',
      customerEmail: 'maria.gomez@example.com',
      purchaseDate: '2026-09-22 11:05',
      totalPaid: 12400,
      status: 'valida'
    },
    {
      id: 't3',
      code: 'TKT-55102',
      movieTitle: 'Aventura en el Reino Mágico',
      scheduleTime: '14:00 (Sala 5)',
      room: 'Sala 5 (Familiar)',
      format: '2D Castellano',
      seats: ['F-6', 'F-7', 'F-8'],
      candyItems: ['2x Balde Mediano', '3x Bebidas'],
      customerName: 'Carlos López',
      customerEmail: 'carlos.l@example.com',
      purchaseDate: '2026-09-21 16:30',
      totalPaid: 18200,
      status: 'utilizada',
      validatedAt: '2026-09-21 17:50',
      validatedBy: 'Empleado Empleadinho'
    }
  ]);
  readonly tickets = this._tickets.asReadonly();

  // Daily Reports Data (last 7 days)
  readonly dailyReports: DailyReportItem[] = [
    {
      date: '2026-09-22',
      ticketsCount: 420,
      candyCount: 310,
      ticketsIncome: 2310000,
      candyIncome: 1240000,
      totalIncome: 3550000
    },
    {
      date: '2026-09-21',
      ticketsCount: 380,
      candyCount: 295,
      ticketsIncome: 2090000,
      candyIncome: 1180000,
      totalIncome: 3270000
    },
    {
      date: '2026-09-20',
      ticketsCount: 650,
      candyCount: 520,
      ticketsIncome: 3575000,
      candyIncome: 2080000,
      totalIncome: 5655000
    },
    {
      date: '2026-09-19',
      ticketsCount: 710,
      candyCount: 590,
      ticketsIncome: 3905000,
      candyIncome: 2360000,
      totalIncome: 6265000
    },
    {
      date: '2026-09-18',
      ticketsCount: 490,
      candyCount: 370,
      ticketsIncome: 2695000,
      candyIncome: 1480000,
      totalIncome: 4175000
    },
    {
      date: '2026-09-17',
      ticketsCount: 310,
      candyCount: 220,
      ticketsIncome: 1705000,
      candyIncome: 880000,
      totalIncome: 2585000
    },
    {
      date: '2026-09-16',
      ticketsCount: 290,
      candyCount: 210,
      ticketsIncome: 1595000,
      candyIncome: 840000,
      totalIncome: 2435000
    }
  ];

  // Movie views and ranking statistics
  readonly movieStats: MovieViewStat[] = [
    {
      movieId: 'm1',
      movieTitle: 'Duna: Odisea Espacial',
      viewsWeekly: 4200,
      viewsMonthly: 18500,
      ticketsSoldWeekly: 3850,
      ticketsSoldMonthly: 12500,
      percentageWeekly: 35,
      percentageMonthly: 32
    },
    {
      movieId: 'm2',
      movieTitle: 'Guardianes del Abismo',
      viewsWeekly: 3100,
      viewsMonthly: 14200,
      ticketsSoldWeekly: 2800,
      ticketsSoldMonthly: 9800,
      percentageWeekly: 26,
      percentageMonthly: 25
    },
    {
      movieId: 'm3',
      movieTitle: 'Aventura en el Reino Mágico',
      viewsWeekly: 2900,
      viewsMonthly: 13100,
      ticketsSoldWeekly: 2650,
      ticketsSoldMonthly: 9200,
      percentageWeekly: 24,
      percentageMonthly: 23
    },
    {
      movieId: 'm5',
      movieTitle: 'Velocidad Terminal 5',
      viewsWeekly: 1100,
      viewsMonthly: 8900,
      ticketsSoldWeekly: 950,
      ticketsSoldMonthly: 6100,
      percentageWeekly: 9,
      percentageMonthly: 12
    },
    {
      movieId: 'm4',
      movieTitle: 'Ecos de Medianoche',
      viewsWeekly: 700,
      viewsMonthly: 7200,
      ticketsSoldWeekly: 620,
      ticketsSoldMonthly: 5400,
      percentageWeekly: 6,
      percentageMonthly: 8
    }
  ];

  // Log action helper
  addAuditLog(
    action: AuditLogEntry['action'],
    category: string,
    details: string
  ): void {
    const user = this.authService.currentUser();
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: formattedDate,
      userId: user?.id || 'anon',
      userName: user ? `${user.nombre} ${user.apellido}` : 'Usuario Sistema',
      userRole: user?.rol === 'administrador' ? 'administrador' : 'empleado',
      action,
      category,
      details
    };

    this._auditLogs.update(current => [newEntry, ...current]);
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
    this._candyProducts.update(curr => [product, ...curr]);
    this.addAuditLog('modificar_candy', 'Candy Bar', `Creó el producto "${product.name}" con precio $${product.price} y costo ${product.pointsCost} pts.`);
  }

  updateCandyProduct(product: CandyProduct): void {
    const old = this._candyProducts().find(p => p.id === product.id);
    this._candyProducts.update(curr =>
      curr.map(p => p.id === product.id ? { ...p, ...product } : p)
    );
    if (old && old.price !== product.price) {
      this.addAuditLog('modificar_precio', 'Candy Bar', `Modificó precio de "${product.name}" de $${old.price} a $${product.price}.`);
    } else {
      this.addAuditLog('modificar_candy', 'Candy Bar', `Actualizó el producto "${product.name}".`);
    }
  }

  deleteCandyProduct(id: string): void {
    const p = this._candyProducts().find(item => item.id === id);
    this._candyProducts.update(curr => curr.filter(item => item.id !== id));
    if (p) {
      this.addAuditLog('modificar_candy', 'Candy Bar', `Eliminó el producto "${p.name}".`);
    }
  }

  // --- SPECIAL COMBOS ABM ---
  addSpecialCombo(combo: SpecialCombo): void {
    this._specialCombos.update(curr => [combo, ...curr]);
    this.addAuditLog('modificar_candy', 'Combos Especiales', `Creó el combo "${combo.name}" a precio fijo $${combo.fixedPrice}.`);
  }

  updateSpecialCombo(combo: SpecialCombo): void {
    const old = this._specialCombos().find(c => c.id === combo.id);
    this._specialCombos.update(curr =>
      curr.map(c => c.id === combo.id ? { ...c, ...combo } : c)
    );
    if (old && old.fixedPrice !== combo.fixedPrice) {
      this.addAuditLog('modificar_precio', 'Combos Especiales', `Modificó precio del combo "${combo.name}" de $${old.fixedPrice} a $${combo.fixedPrice}.`);
    } else {
      this.addAuditLog('modificar_candy', 'Combos Especiales', `Actualizó combo "${combo.name}".`);
    }
  }

  deleteSpecialCombo(id: string): void {
    const c = this._specialCombos().find(item => item.id === id);
    this._specialCombos.update(curr => curr.filter(item => item.id !== id));
    if (c) {
      this.addAuditLog('modificar_candy', 'Combos Especiales', `Eliminó combo "${c.name}".`);
    }
  }

  // --- COUPONS ABM ---
  addCoupon(coupon: DiscountCoupon): void {
    this._discountCoupons.update(curr => [coupon, ...curr]);
    this.addAuditLog('crear_cupon', 'Promociones', `Creó cupón "${coupon.code}" con ${coupon.discountPercent}% de descuento.`);
  }

  updateCoupon(coupon: DiscountCoupon): void {
    this._discountCoupons.update(curr =>
      curr.map(c => c.id === coupon.id ? { ...c, ...coupon } : c)
    );
    this.addAuditLog('crear_cupon', 'Promociones', `Actualizó configuración del cupón "${coupon.code}" (${coupon.discountPercent}%).`);
  }

  deleteCoupon(id: string): void {
    const c = this._discountCoupons().find(item => item.id === id);
    this._discountCoupons.update(curr => curr.filter(item => item.id !== id));
    if (c) {
      this.addAuditLog('crear_cupon', 'Promociones', `Eliminó el cupón "${c.code}".`);
    }
  }

  // Update Welcome coupon percentage
  updateWelcomeDiscountPercent(newPercent: number): void {
    this._discountCoupons.update(curr =>
      curr.map(c => c.type === 'primera_compra' ? { ...c, discountPercent: newPercent } : c)
    );
    this.addAuditLog('crear_cupon', 'Promociones', `Actualizó el porcentaje de descuento de primera compra al ${newPercent}%.`);
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
  validateTicketByCode(codeToValidate: string): {
    success: boolean;
    message: string;
    ticket?: ValidatableTicket;
  } {
    const cleanCode = codeToValidate.trim().toUpperCase();
    const ticket = this._tickets().find(t => t.code.toUpperCase() === cleanCode);

    if (!ticket) {
      return {
        success: false,
        message: `No se encontró ningún boleto con el código "${cleanCode}".`
      };
    }

    if (ticket.status === 'utilizada') {
      return {
        success: false,
        message: `El boleto #${ticket.code} ya fue UTILIZADO previamente el ${ticket.validatedAt || 'día de la función'} por ${ticket.validatedBy || 'el personal'}.`,
        ticket
      };
    }

    if (ticket.status === 'cancelada') {
      return {
        success: false,
        message: `El boleto #${ticket.code} fue CANCELADO y el monto reintegrado como saldo a favor.`,
        ticket
      };
    }

    // Valid ticket! Invalidate immediately
    const user = this.authService.currentUser();
    const validatorName = user ? `${user.nombre} ${user.apellido} (${user.rol})` : 'Personal Cine';
    const nowStr = new Date().toLocaleString('es-AR');

    const updatedTicket: ValidatableTicket = {
      ...ticket,
      status: 'utilizada',
      validatedAt: nowStr,
      validatedBy: validatorName
    };

    this._tickets.update(curr =>
      curr.map(t => t.id === ticket.id ? updatedTicket : t)
    );

    this.addAuditLog(
      'validar_qr',
      'Control de Acceso',
      `Validó e invalidó boleto #${ticket.code} (${ticket.movieTitle} - ${ticket.room}). Cliente: ${ticket.customerName}.`
    );

    return {
      success: true,
      message: `¡Boleto #${ticket.code} VALIDADO e INVALIDADO con éxito! Acceso permitido a ${ticket.movieTitle}.`,
      ticket: updatedTicket
    };
  }

  // --- EXPORT DAILY REPORTS ---
  exportDailyReportToCsv(): void {
    const headers = ['Fecha', 'Entradas Vendidas', 'Productos Candy', 'Recaudacion Entradas ($)', 'Recaudacion Candy ($)', 'Total Facturado ($)'];
    const rows = this.dailyReports.map(r => [
      r.date,
      r.ticketsCount,
      r.candyCount,
      r.ticketsIncome,
      r.candyIncome,
      r.totalIncome
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_cineiv_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  exportDailyReportToExcel(): void {
    // Generate XML/HTML format that Excel natively opens
    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body>
        <h2>Reporte de Facturación y Entradas - CineIV</h2>
        <p>Generado el: ${new Date().toLocaleString('es-AR')}</p>
        <table border="1">
          <tr style="background-color: #D4AF37; color: #000; font-weight: bold;">
            <th>Fecha</th>
            <th>Entradas Vendidas</th>
            <th>Productos Candy Bar</th>
            <th>Facturación Entradas ($)</th>
            <th>Facturación Candy Bar ($)</th>
            <th>Total General ($)</th>
          </tr>
    `;

    this.dailyReports.forEach(r => {
      tableHtml += `
        <tr>
          <td>${r.date}</td>
          <td>${r.ticketsCount}</td>
          <td>${r.candyCount}</td>
          <td>${r.ticketsIncome}</td>
          <td>${r.candyIncome}</td>
          <td>${r.totalIncome}</td>
        </tr>
      `;
    });

    tableHtml += `</table></body></html>`;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_facturacion_cineiv_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  printOrDownloadPdf(): void {
    window.print();
  }
}
