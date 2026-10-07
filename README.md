# CineIV - Sistema Integral de Cine 🎬🍿

[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

Proyecto final para la materia **Programación IV (UTN - 2026)**. Consiste en una aplicación web progresiva (PWA) completa para la gestión de un cine, incluyendo venta de entradas, candy bar, roles de empleado/administrador, y reportes financieros.

---

## 🔗 Enlaces Importantes
* **Aplicación Desplegada:** [https://prograiv.gondragon.com.ar/](https://prograiv.gondragon.com.ar/)
* **Repositorio GitHub:** [https://github.com/GonDragon/tp-progIV-utn2026](https://github.com/GonDragon/tp-progIV-utn2026)

---

## 🏛 Arquitectura del Proyecto

El sistema está construido bajo una arquitectura de **Frontend SPA (Single Page Application)** separada, utilizando un modelo de Backend-as-a-Service (BaaS).

### Frontend (Cliente)
* **Framework:** Angular 19+ (Standalone Components).
* **Estilos:** CSS puro combinado con TailwindCSS para un diseño UI/UX responsivo y ágil.
* **Navegación:** Enrutamiento modular estandarizado.

### Backend as a Service (BaaS)
* **Plataforma:** Supabase.
* **Base de Datos:** PostgreSQL (Estructura relacional para Funciones, Transacciones, Asientos y Fidelización).
* **Autenticación:** Supabase Auth (Manejo de sesiones, JWT).
* **Storage:** Almacenamiento de pósters y recursos estáticos.

---

## 🛠 Decisiones Técnicas y Patrones de Diseño

Para cumplir con los requerimientos técnicos y de negocio establecidos por los inversores y la cátedra, se tomaron las siguientes decisiones de implementación:

### 1. Lazy Loading y Optimización de Rutas
Se implementó **Lazy Loading** (carga diferida) en el archivo de rutas principal (`app.routes.ts`) a través de la instrucción `loadComponent`. Esto evita que el código de los paneles administrativos o módulos pesados se descargue en el primer pintado (FCP), reduciendo drásticamente el tamaño del *bundle* inicial y mejorando el rendimiento para los clientes anónimos.

### 2. Sincronización en Tiempo Real (Supabase Realtime)
Para el **Mapa de Selección de Asientos**, se configuró una suscripción de WebSockets (*Supabase Realtime*). Esto permite que el sistema detecte y bloquee visualmente las butacas que están siendo seleccionadas o compradas de manera simultánea por otros usuarios, evitando colisiones de transacciones.

### 3. PWA (Progressive Web App)
El proyecto está configurado como PWA mediante `ngsw-config.json` y el `manifest.webmanifest`. Esto permite que la aplicación sea instalable en dispositivos móviles, mejore sus tiempos de carga mediante estrategias de caché (Service Workers) y ofrezca una experiencia visual nativa sin la barra del navegador.

### 4. Seguridad y Guardianes (Auth Guards)
Se implementaron **Route Guards** (`canActivate`) personalizados para aislar el acceso a distintas rutas según los 4 roles del sistema:
* **Anónimo:** Acceso a cartelera y proceso de compra.
* **Autenticado (Cliente):** Acceso a "Mi Perfil" (Puntos, Historial, Cancelaciones a crédito).
* **Empleado:** Acceso exclusivo a los componentes de Validación/Escáner QR (`qr-scanner`).
* **Administrador:** Acceso a los dashboards, reportes exportables, ABM de películas y configuración de cupones.

### 5. Algoritmo de Asignación Automática de Salas
En lugar de permitir que el administrador asigne salas manualmente con riesgo a colisión, la lógica de negocio se encarga de analizar los horarios solicitados. El algoritmo cruza la duración de la película con un **buffer obligatorio de 30 minutos por limpieza**, buscando un espacio disponible en la grilla de las salas existentes.

### 6. Desacoplamiento (Smart & Dumb Components)
Se siguió el principio de responsabilidad única. Pantallas como el Dashboard de Admin o el flujo de compra (`purchase-flow`) actúan como *Smart Components* (comunicación con servicios y DB), delegando el renderizado de la UI a *Dumb Components* (por ejemplo, `movie-card`, `seat`, `candy-product-card`) mediante decoradores `@Input()` y `@Output()`.

---

## 🚀 Instalación y Despliegue Local

Para clonar y ejecutar este proyecto en tu entorno local:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/GonDragon/tp-progIV-utn2026.git
   ```

2. **Instalar dependencias:**
   ```bash
   cd tp-progIV-utn2026
   npm install
   ```

3. **Configurar variables de entorno:**
  * Crear un archivo `src/environments/environment.development.ts`.
  * Incluir las credenciales de la API de Supabase (`supabaseUrl` y `supabaseKey`).

4. **Ejecutar el servidor de desarrollo:**
   ```bash
   npm start
   ```
   La aplicación estará disponible en `http://localhost:4200/`.
