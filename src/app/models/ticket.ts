export interface EntradaTicketDB {
  id: number;
  transaccion_id: number;
  funcion_id: number;
  butaca_id: number;
  codigo_qr: string;
  estado_qr: string;
}

export interface TicketCandyItem {
  nombre: string;
  cantidad: number;
  categoria?: string;
  tipo: 'producto' | 'combo';
}

export interface TicketDetails {
  id: number;
  transaccionId: number;
  codigoQr: string;
  estadoQr: string;
  isUsed: boolean;
  pelicula: {
    id?: number;
    nombre: string;
    duracionMinutos?: number;
    imagenUrl?: string;
    restriccionEdad?: string;
    sinopsis?: string;
  };
  funcion: {
    id?: number;
    fechaHoraInicio: string;
    formato: string;
    idioma: string;
    precioBase: number;
    salaNombre: string;
  };
  butaca: {
    id?: number;
    fila: string;
    columna: number;
    tipo: string;
    codigoButaca: string;
  };
  transaccion: {
    id?: number;
    montoTotal: number;
    fechaCompra: string;
    estado: string;
  };
  cliente: {
    id?: string;
    nombre: string;
    apellido: string;
    nombreCompleto: string;
    email: string;
  };
  candyItems: TicketCandyItem[];
}
