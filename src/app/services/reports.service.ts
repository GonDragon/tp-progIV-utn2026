import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from './auth';
import {
  DailyReportItem,
  MovieViewStat,
  CandySalesStat,
  ReportKpiSummary,
  ReportTimeframe,
  SaleTransactionPayload
} from '../models/reports';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  // Raw database records
  private readonly _transactions = signal<any[]>([]);
  private readonly _tickets = signal<any[]>([]);
  private readonly _candyTransactions = signal<any[]>([]);
  private readonly _movies = signal<any[]>([]);
  private readonly _functions = signal<any[]>([]);
  private readonly _candyProducts = signal<any[]>([]);
  private readonly _combos = signal<any[]>([]);
  private readonly _coupons = signal<any[]>([]);
  private readonly _profiles = signal<any[]>([]);
  private readonly _seats = signal<any[]>([]);

  // State signals
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  readonly timeframe = signal<ReportTimeframe>('7d');
  readonly movieChartTimeframe = signal<'weekly' | 'monthly'>('weekly');

  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly rawTransactions = this._transactions.asReadonly();
  readonly rawFunctions = this._functions.asReadonly();
  readonly rawCandyProducts = this._candyProducts.asReadonly();
  readonly rawCombos = this._combos.asReadonly();
  readonly rawMovies = this._movies.asReadonly();

  constructor() {
    this.loadReportsData();
  }

  // --- Filtered Transactions by Timeframe ---
  private readonly filteredTransactions = computed(() => {
    const list = this._transactions();
    const tf = this.timeframe();
    if (tf === 'all') return list;

    const days = tf === '7d' ? 7 : tf === '14d' ? 14 : 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    cutoffDate.setHours(0, 0, 0, 0);

    return list.filter(tx => {
      const txDate = new Date(tx.fecha_compra);
      return txDate >= cutoffDate;
    });
  });

  // --- Daily Reports Computation ---
  readonly dailyReports = computed<DailyReportItem[]>(() => {
    const txs = this.filteredTransactions();
    const tickets = this._tickets();
    const candyItems = this._candyTransactions();
    const functions = this._functions();
    const candyProducts = this._candyProducts();
    const combos = this._combos();

    // Map functions by ID for quick price lookup
    const funcPriceMap = new Map<number, number>();
    functions.forEach(f => {
      funcPriceMap.set(f.id, Number(f.precio_base) || 0);
    });

    // Map candy products price by ID
    const candyPriceMap = new Map<number, number>();
    candyProducts.forEach(p => {
      candyPriceMap.set(p.id, Number(p.precio) || 0);
    });

    // Map combos price by ID
    const comboPriceMap = new Map<number, number>();
    combos.forEach(c => {
      comboPriceMap.set(c.id, Number(c.precio_fijo) || 0);
    });

    // Grouping by date (YYYY-MM-DD)
    const groupedByDate: Record<string, {
      ticketsCount: number;
      candyCount: number;
      ticketsIncome: number;
      candyIncome: number;
      totalIncome: number;
    }> = {};

    // Group transactions
    const validTxIds = new Set<number>();
    txs.forEach(tx => {
      if (tx.estado === 'Cancelada') return;
      validTxIds.add(tx.id);

      const d = new Date(tx.fecha_compra);
      const dateKey = !isNaN(d.getTime())
        ? d.toISOString().slice(0, 10)
        : String(tx.fecha_compra).slice(0, 10);

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          ticketsCount: 0,
          candyCount: 0,
          ticketsIncome: 0,
          candyIncome: 0,
          totalIncome: 0
        };
      }
      groupedByDate[dateKey].totalIncome += Number(tx.monto_total) || 0;
    });

    // Tally tickets
    tickets.forEach(ticket => {
      if (!validTxIds.has(ticket.transaccion_id)) return;
      const tx = txs.find(t => t.id === ticket.transaccion_id);
      if (!tx) return;

      const d = new Date(tx.fecha_compra);
      const dateKey = !isNaN(d.getTime())
        ? d.toISOString().slice(0, 10)
        : String(tx.fecha_compra).slice(0, 10);

      if (groupedByDate[dateKey]) {
        groupedByDate[dateKey].ticketsCount += 1;
        const price = funcPriceMap.get(ticket.funcion_id) || 0;
        groupedByDate[dateKey].ticketsIncome += price;
      }
    });

    // Tally candy items
    candyItems.forEach(item => {
      if (!validTxIds.has(item.transaccion_id)) return;
      const tx = txs.find(t => t.id === item.transaccion_id);
      if (!tx) return;

      const d = new Date(tx.fecha_compra);
      const dateKey = !isNaN(d.getTime())
        ? d.toISOString().slice(0, 10)
        : String(tx.fecha_compra).slice(0, 10);

      if (groupedByDate[dateKey]) {
        const qty = Number(item.cantidad) || 1;
        groupedByDate[dateKey].candyCount += qty;

        let itemRevenue = 0;
        if (item.producto_id && candyPriceMap.has(item.producto_id)) {
          itemRevenue = (candyPriceMap.get(item.producto_id) || 0) * qty;
        } else if (item.combo_id && comboPriceMap.has(item.combo_id)) {
          itemRevenue = (comboPriceMap.get(item.combo_id) || 0) * qty;
        }
        groupedByDate[dateKey].candyIncome += itemRevenue;
      }
    });

    // Convert map to sorted array (newest first)
    const result: DailyReportItem[] = Object.keys(groupedByDate)
      .sort((a, b) => b.localeCompare(a))
      .map(date => {
        const data = groupedByDate[date];
        // If totalIncome was 0 but tickets/candy had amounts, adjust fallback
        const total = data.totalIncome > 0
          ? data.totalIncome
          : (data.ticketsIncome + data.candyIncome);

        return {
          date,
          ticketsCount: data.ticketsCount,
          candyCount: data.candyCount,
          ticketsIncome: data.ticketsIncome,
          candyIncome: data.candyIncome,
          totalIncome: total
        };
      });

    return result;
  });

  // --- Movie Statistics ---
  readonly movieStats = computed<MovieViewStat[]>(() => {
    const movies = this._movies();
    const tickets = this._tickets();
    const txs = this._transactions();
    const functions = this._functions();

    // Map function ID to movie ID
    const funcToMovieMap = new Map<number, number>();
    functions.forEach(f => {
      funcToMovieMap.set(f.id, f.pelicula_id);
    });

    // Map tx ID to date
    const txDateMap = new Map<number, Date>();
    txs.forEach(t => {
      if (t.estado !== 'Cancelada') {
        txDateMap.set(t.id, new Date(t.fecha_compra));
      }
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const movieSalesWeekly = new Map<number, number>();
    const movieSalesMonthly = new Map<number, number>();

    tickets.forEach(ticket => {
      const txDate = txDateMap.get(ticket.transaccion_id);
      if (!txDate || isNaN(txDate.getTime())) return;

      const movieId = funcToMovieMap.get(ticket.funcion_id);
      if (movieId === undefined) return;

      if (txDate >= sevenDaysAgo) {
        movieSalesWeekly.set(movieId, (movieSalesWeekly.get(movieId) || 0) + 1);
      }
      if (txDate >= thirtyDaysAgo) {
        movieSalesMonthly.set(movieId, (movieSalesMonthly.get(movieId) || 0) + 1);
      }
    });

    let totalWeekly = 0;
    let totalMonthly = 0;
    movieSalesWeekly.forEach(val => (totalWeekly += val));
    movieSalesMonthly.forEach(val => (totalMonthly += val));

    const stats: MovieViewStat[] = movies.map(movie => {
      const weekly = movieSalesWeekly.get(movie.id) || 0;
      const monthly = movieSalesMonthly.get(movie.id) || 0;
      const pctWeekly = totalWeekly > 0 ? Math.round((weekly / totalWeekly) * 100) : 0;
      const pctMonthly = totalMonthly > 0 ? Math.round((monthly / totalMonthly) * 100) : 0;

      return {
        movieId: String(movie.id),
        movieTitle: movie.nombre,
        viewsWeekly: weekly,
        viewsMonthly: monthly,
        ticketsSoldWeekly: weekly,
        ticketsSoldMonthly: monthly,
        percentageWeekly: pctWeekly,
        percentageMonthly: pctMonthly
      };
    });

    // Sort descending by monthly views (or weekly)
    const isWeekly = this.movieChartTimeframe() === 'weekly';
    return stats.sort((a, b) =>
      isWeekly
        ? (b.viewsWeekly - a.viewsWeekly || b.viewsMonthly - a.viewsMonthly)
        : (b.viewsMonthly - a.viewsMonthly || b.viewsWeekly - a.viewsWeekly)
    );
  });

  // --- Top Selling Candy Products & Combos ---
  readonly candyStats = computed<CandySalesStat[]>(() => {
    const candyItems = this._candyTransactions();
    const products = this._candyProducts();
    const combos = this._combos();
    const txs = this._transactions();

    // Map active transaction IDs
    const validTxIds = new Set<number>();
    txs.forEach(t => {
      if (t.estado !== 'Cancelada') validTxIds.add(t.id);
    });

    const productSalesMap = new Map<number, { count: number; income: number }>();
    const comboSalesMap = new Map<number, { count: number; income: number }>();

    candyItems.forEach(item => {
      if (!validTxIds.has(item.transaccion_id)) return;
      const qty = Number(item.cantidad) || 1;

      if (item.producto_id) {
        const current = productSalesMap.get(item.producto_id) || { count: 0, income: 0 };
        const prod = products.find(p => p.id === item.producto_id);
        const price = prod ? Number(prod.precio) : 0;
        productSalesMap.set(item.producto_id, {
          count: current.count + qty,
          income: current.income + price * qty
        });
      } else if (item.combo_id) {
        const current = comboSalesMap.get(item.combo_id) || { count: 0, income: 0 };
        const combo = combos.find(c => c.id === item.combo_id);
        const price = combo ? Number(combo.precio_fijo) : 0;
        comboSalesMap.set(item.combo_id, {
          count: current.count + qty,
          income: current.income + price * qty
        });
      }
    });

    const list: CandySalesStat[] = [];

    products.forEach(p => {
      const sales = productSalesMap.get(p.id) || { count: 0, income: 0 };
      list.push({
        id: `prod-${p.id}`,
        name: p.nombre,
        category: p.categoria || 'Snack',
        salesCount: sales.count,
        totalIncome: sales.income,
        percentage: 0
      });
    });

    combos.forEach(c => {
      const sales = comboSalesMap.get(c.id) || { count: 0, income: 0 };
      list.push({
        id: `combo-${c.id}`,
        name: c.nombre,
        category: 'Combo',
        salesCount: sales.count,
        totalIncome: sales.income,
        percentage: 0
      });
    });

    // Find highest sales count to calculate relative percentages
    const maxSales = Math.max(...list.map(i => i.salesCount), 1);
    list.forEach(i => {
      i.percentage = Math.round((i.salesCount / maxSales) * 100);
    });

    // Sort descending by sales count
    return list.sort((a, b) => b.salesCount - a.salesCount || b.totalIncome - a.totalIncome);
  });

  // --- KPI Summary Metrics ---
  readonly kpiSummary = computed<ReportKpiSummary>(() => {
    const reports = this.dailyReports();
    const txs = this.filteredTransactions().filter(t => t.estado !== 'Cancelada');
    const candyItems = this._candyTransactions();

    const totalIncome = reports.reduce((acc, r) => acc + r.totalIncome, 0);
    const totalTickets = reports.reduce((acc, r) => acc + r.ticketsCount, 0);
    const totalCandy = reports.reduce((acc, r) => acc + r.candyCount, 0);
    const daysCount = reports.length || 1;
    const averageTicketsPerDay = Math.round(totalTickets / daysCount);

    // Calculate candy attachment rate
    const txIdsWithCandy = new Set<number>();
    candyItems.forEach(ci => {
      if (ci.transaccion_id) txIdsWithCandy.add(ci.transaccion_id);
    });

    let txWithCandyCount = 0;
    txs.forEach(t => {
      if (txIdsWithCandy.has(t.id)) txWithCandyCount++;
    });

    const candyAttachmentRate = txs.length > 0
      ? Math.round((txWithCandyCount / txs.length) * 100)
      : 0;

    // Growth comparison vs previous period
    let growthPercentage = 0;
    const tf = this.timeframe();
    if (tf !== 'all') {
      const days = tf === '7d' ? 7 : tf === '14d' ? 14 : 30;
      const currentCutoff = new Date();
      currentCutoff.setDate(currentCutoff.getDate() - days);

      const prevCutoff = new Date();
      prevCutoff.setDate(prevCutoff.getDate() - days * 2);

      const allValidTxs = this._transactions().filter(t => t.estado !== 'Cancelada');
      let prevPeriodIncome = 0;

      allValidTxs.forEach(tx => {
        const d = new Date(tx.fecha_compra);
        if (d >= prevCutoff && d < currentCutoff) {
          prevPeriodIncome += Number(tx.monto_total) || 0;
        }
      });

      if (prevPeriodIncome > 0) {
        growthPercentage = Math.round(((totalIncome - prevPeriodIncome) / prevPeriodIncome) * 100);
      } else if (totalIncome > 0) {
        growthPercentage = 100;
      }
    }

    return {
      totalIncome,
      totalTickets,
      totalCandy,
      averageTicketsPerDay,
      candyAttachmentRate,
      growthPercentage,
      totalTransactionsCount: txs.length
    };
  });

  // --- Load all Data from Supabase ---
  async loadReportsData(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const [
        txRes,
        tktRes,
        candyTxRes,
        moviesRes,
        funcRes,
        candyProdRes,
        combosRes,
        couponsRes,
        profilesRes,
        seatsRes
      ] = await Promise.all([
        this.supabase.client.from('transacciones').select('*').order('fecha_compra', { ascending: false }),
        this.supabase.client.from('entradas_tickets').select('*'),
        this.supabase.client.from('transacciones_candy').select('*'),
        this.supabase.client.from('peliculas').select('*'),
        this.supabase.client.from('funciones').select('*'),
        this.supabase.client.from('productos_candy').select('*'),
        this.supabase.client.from('combos').select('*'),
        this.supabase.client.from('cupones').select('*'),
        this.supabase.client.from('perfiles').select('id, email, nombre, apellido, rol'),
        this.supabase.client.from('butacas').select('*').limit(200)
      ]);

      if (txRes.data) this._transactions.set(txRes.data);
      if (tktRes.data) this._tickets.set(tktRes.data);
      if (candyTxRes.data) this._candyTransactions.set(candyTxRes.data);
      if (moviesRes.data) this._movies.set(moviesRes.data);
      if (funcRes.data) this._functions.set(funcRes.data);
      if (candyProdRes.data) this._candyProducts.set(candyProdRes.data);
      if (combosRes.data) this._combos.set(combosRes.data);
      if (couponsRes.data) this._coupons.set(couponsRes.data);
      if (profilesRes.data) this._profiles.set(profilesRes.data);
      if (seatsRes.data) this._seats.set(seatsRes.data);

    } catch (err: any) {
      console.error('Error al cargar datos para reportes desde Supabase:', err);
      this._error.set(err.message || 'Error al conectar con la base de datos de Supabase');
    } finally {
      this._isLoading.set(false);
    }
  }

  // --- Timeframe selector ---
  setTimeframe(tf: ReportTimeframe): void {
    this.timeframe.set(tf);
  }

  setMovieChartTimeframe(tf: 'weekly' | 'monthly'): void {
    this.movieChartTimeframe.set(tf);
  }

  // --- Register a Sale / Transaction in Supabase ---
  async createSaleTransaction(payload: SaleTransactionPayload): Promise<{ success: boolean; message: string }> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      // 1. Calculate total
      let calculatedTotal = 0;
      payload.tickets.forEach(t => (calculatedTotal += Number(t.precio) || 0));
      payload.candyItems.forEach(c => (calculatedTotal += (Number(c.precioUnitario) || 0) * (Number(c.cantidad) || 1)));

      // Apply coupon discount if any
      if (payload.cuponId) {
        const coupon = this._coupons().find(c => c.id === payload.cuponId);
        if (coupon && coupon.porcentaje_descuento) {
          const discount = (calculatedTotal * Number(coupon.porcentaje_descuento)) / 100;
          calculatedTotal = Math.max(0, calculatedTotal - discount);
        }
      }

      // 2. Insert into transacciones
      const { data: txData, error: txError } = await this.supabase.client
        .from('transacciones')
        .insert({
          perfil_id: payload.perfilId || null,
          monto_total: calculatedTotal,
          estado: 'Completada',
          cupon_id: payload.cuponId || null
        })
        .select()
        .single();

      if (txError || !txData) {
        throw new Error(txError?.message || 'Error al crear transacción');
      }

      const txId = txData.id;

      // 3. Insert tickets in entradas_tickets
      if (payload.tickets.length > 0) {
        const ticketsToInsert = payload.tickets.map((t, idx) => {
          // If no specific butaca provided, pick first available seat or default
          const defaultSeatId = this._seats()[idx % (this._seats().length || 1)]?.id || 1;
          const butacaId = t.butacaId || defaultSeatId;
          const uniqueQr = `TKT-${Date.now()}-${txId}-${idx + 1}-${Math.floor(Math.random() * 1000)}`;

          return {
            transaccion_id: txId,
            funcion_id: t.funcionId,
            butaca_id: butacaId,
            codigo_qr: uniqueQr,
            estado_qr: 'Activo'
          };
        });

        const { error: tktError } = await this.supabase.client
          .from('entradas_tickets')
          .insert(ticketsToInsert);

        if (tktError) {
          console.error('Error insertando entradas_tickets:', tktError);
        }
      }

      // 4. Insert candy items in transacciones_candy
      if (payload.candyItems.length > 0) {
        const candyToInsert = payload.candyItems.map(c => ({
          transaccion_id: txId,
          producto_id: c.productoId || null,
          combo_id: c.comboId || null,
          cantidad: Number(c.cantidad) || 1
        }));

        const { error: candyError } = await this.supabase.client
          .from('transacciones_candy')
          .insert(candyToInsert);

        if (candyError) {
          console.error('Error insertando transacciones_candy:', candyError);
        }
      }

      // 5. Log activity
      await this.logActivity(
        `Registró venta #${txId} por $${calculatedTotal.toLocaleString('es-AR')} (${payload.tickets.length} entradas, ${payload.candyItems.length} ítems candy)`
      );

      // 6. Refresh data from Supabase
      await this.loadReportsData();

      return {
        success: true,
        message: `Venta #${txId} registrada y persistida exitosamente en Supabase.`
      };
    } catch (err: any) {
      console.error('Error al registrar transacción:', err);
      this._error.set(err.message || 'Error al persistir la transacción');
      return {
        success: false,
        message: err.message || 'Error al persistir la transacción'
      };
    } finally {
      this._isLoading.set(false);
    }
  }

  // --- Export Daily Report to Excel ---
  async exportDailyReportToExcel(): Promise<void> {
    const reports = this.dailyReports();
    const kpi = this.kpiSummary();

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body>
        <h2>Reporte de Facturación y Analíticas - CineIV</h2>
        <p><strong>Generado el:</strong> ${new Date().toLocaleString('es-AR')}</p>
        <p><strong>Período:</strong> ${this.timeframe() === '7d' ? 'Últimos 7 días' : this.timeframe() === '14d' ? 'Últimos 14 días' : this.timeframe() === '30d' ? 'Últimos 30 días' : 'Histórico Total'}</p>
        <table border="1">
          <tr style="background-color: #D4AF37; color: #000; font-weight: bold; text-align: center;">
            <th>Fecha</th>
            <th>Entradas Vendidas</th>
            <th>Productos Candy Bar</th>
            <th>Facturación Taquilla ($)</th>
            <th>Facturación Candy Bar ($)</th>
            <th>Facturación Total ($)</th>
          </tr>
    `;

    reports.forEach(r => {
      tableHtml += `
        <tr>
          <td style="text-align: center;">${r.date}</td>
          <td style="text-align: center;">${r.ticketsCount}</td>
          <td style="text-align: center;">${r.candyCount}</td>
          <td style="text-align: right;">${r.ticketsIncome}</td>
          <td style="text-align: right;">${r.candyIncome}</td>
          <td style="text-align: right; font-weight: bold;">${r.totalIncome}</td>
        </tr>
      `;
    });

    tableHtml += `
          <tr style="background-color: #1a1a1a; color: #D4AF37; font-weight: bold;">
            <td>TOTALES</td>
            <td style="text-align: center;">${kpi.totalTickets}</td>
            <td style="text-align: center;">${kpi.totalCandy}</td>
            <td style="text-align: right;">${reports.reduce((s, r) => s + r.ticketsIncome, 0)}</td>
            <td style="text-align: right;">${reports.reduce((s, r) => s + r.candyIncome, 0)}</td>
            <td style="text-align: right;">${kpi.totalIncome}</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_facturacion_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    await this.logActivity(`Exportó reporte de facturación a formato Excel (.xls)`);
  }

  // --- Export Daily Report to CSV ---
  async exportDailyReportToCsv(): Promise<void> {
    const reports = this.dailyReports();
    const headers = ['Fecha', 'Entradas Vendidas', 'Items Candy', 'Recaudacion Taquilla ($)', 'Recaudacion Candy ($)', 'Facturacion Total ($)'];
    const rows = reports.map(r => [
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

    await this.logActivity(`Exportó reporte de facturación a formato CSV`);
  }

  // --- Print / PDF ---
  async printOrDownloadPdf(): Promise<void> {
    await this.logActivity(`Imprimió o exportó reporte a PDF`);
    window.print();
  }

  // --- Helper to log in Supabase log_actividad ---
  private async logActivity(action: string): Promise<void> {
    try {
      const currentUser = this.authService.currentUser();
      await this.supabase.client.from('log_actividad').insert({
        perfil_id: currentUser?.id || null,
        accion: action
      });
    } catch (e) {
      console.warn('No se pudo registrar log de actividad en Supabase:', e);
    }
  }
}
