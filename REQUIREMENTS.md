# Resumen de Requerimientos del Sistema de Cine

## Requerimientos Generales y Técnicos
* La aplicación debe estar desplegada con una URL funcional.
* El código fuente debe estar alojado en GitHub.
* Se debe incluir un archivo README detallando la arquitectura y decisiones técnicas.
* El estilo visual debe ser único y producido, con interfaces fáciles de navegar y sin exceso de scroll.
* Se deben utilizar selectores de fecha amigables y eficientes (distintos al ejemplo del correo).
* El desarrollo debe realizarse en Angular, aplicando buenas prácticas y técnicas vistas en clase.
* Se requiere integración con Supabase y PWA (Progressive Web App).

## Página Principal
* Se debe permitir visualizar las películas disponibles y los horarios seleccionados por la administración.
* Las tres películas más vendidas deben mostrarse en primer lugar.
* Se debe incorporar un buscador de películas.
* El buscador debe permitir filtrar por género, considerando que una película puede tener múltiples géneros.
* Se debe incluir una sección "Próximamente" para los estrenos de las próximas semanas.
* Los usuarios deben poder activar alertas/notificaciones para ser avisados cuando las entradas de las películas de "Próximamente" salgan a la venta.
* Se debe mostrar la puntuación promedio de cada película, basada en las reseñas de los usuarios.

## Página de Inscripción (Registro)
* Se deben recopilar los siguientes datos del usuario: mail, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos y cantidad de días de vacaciones por año.
* El sistema debe otorgar automáticamente un cupón de descuento (porcentaje configurable por el administrador) para la primera compra de los usuarios registrados.

## Página de Log-in
* Se debe permitir el acceso a usuarios registrados.
* El sistema debe soportar el acceso de usuarios con roles de empleado (para validación de entradas/Candy Bar) y administrador.
* Debe existir la opción de realizar compras de forma anónima sin necesidad de iniciar sesión.

## Perfil del Usuario
* Se debe mostrar la cantidad de puntos acumulados en el programa de fidelización y el historial de canjes.
* Se debe visualizar el saldo a favor (crédito) obtenido por cancelaciones de compras previas.
* Se debe incluir una sección "Mis películas" que funcione como un historial visual de las películas vistas, incluyendo pósters, fechas y la calificación otorgada por el usuario.

## Panel Administrativo
* Se debe poder controlar la aparición de películas en la página principal, definiendo horarios, formatos (2D, 3D, 4D, 5D) e idiomas (castellano, subtitulada).
* Cada película debe configurarse con: duración, imagen, nombre, sinopsis, géneros y restricciones de edad (18 años, 13 años o sin restricción).
* Se debe gestionar el catálogo del Candy Bar, creando productos, asignándoles categorías y definiendo precios.
* Se deben poder configurar cupones de descuento, incluyendo la modificación del porcentaje de primera compra y la creación de cupones exclusivos para usuarios mayores de 50 años.
* El sistema debe asignar automáticamente la sala para cada función, garantizando que no haya superposición de horarios.
* La asignación automática debe respetar un margen de media hora mínima entre la finalización de una función y el inicio de la siguiente en la misma sala.
* Se deben configurar los costos en puntos de las recompensas del programa de fidelización (ej. entradas gratuitas o productos del Candy Bar).
* Se deben poder configurar combos especiales (entrada + productos del Candy Bar) a precios fijos.
* Se debe poder habilitar un sistema de preventa por película, abriendo la venta 7 días antes del estreno con un precio especial que retorna a la normalidad al finalizar dicho periodo.
* Se debe contar con un reporte de facturación diaria y cantidad de entradas vendidas, exportable a PDF y Excel.
* Se deben incluir gráficos de las películas más vistas por semana y por mes, y del producto del Candy Bar más vendido.
* Se debe registrar un log de actividad (auditoría) con fecha y hora detallando qué usuario (admin/empleado) creó funciones, modificó precios o validó códigos QR.

## Secuencia de Compra de Entrada
* Los usuarios deben poder leer reseñas y calificaciones de otros usuarios antes de confirmar la compra.
* Se debe advertir al comprador si la película tiene restricción de edad (13 o 18 años) e indicar que se requiere un adulto acompañante si corresponde. El sistema no debe dejar comprar a menores la entrada restringida.
* Se deben ofrecer opciones de compra de combos especiales de manera destacada.
* Se debe permitir la adición de productos del Candy Bar al carrito de compra de la entrada.

## Página de Selección de Asiento
* El mapa de la sala debe mostrar una disposición de 20 filas (identificadas con letras) por 3 columnas.
* La distribución base debe ser de 4, 20 y 4 butacas por columna, a excepción de las filas J y K.
* Las filas J y K deben estar adaptadas para personas con discapacidad, contando con 2, 10 y 2 butacas respectivamente, resaltadas de forma visualmente diferente.
* Las últimas tres filas (R, S y T) deben estar marcadas visualmente como butacas VIP con un precio mayor.
* El mapa debe mostrar en tiempo real las butacas que están siendo ocupadas por otras transacciones concurrentes.
* El sistema debe advertir claramente al usuario si está seleccionando una butaca VIP antes de proceder al pago.

## Página de Pago
* Se debe procesar el pago considerando posibles cupones de descuento, precios de preventa y costos mayores por butacas VIP.
* El sistema debe permitir acumular puntos por compras (1 peso gastado = 1 punto ganado) y permitir su canje.
* Se debe permitir el pago utilizando el saldo a favor (crédito) disponible en la cuenta del usuario, combinable con otros métodos de pago.
* Tras el pago, se debe generar un PDF con los datos de la entrada y un código QR único para la función y el retiro de productos del Candy Bar.
* Se debe habilitar la opción de cancelar la compra hasta 2 horas antes de la función, devolviendo el monto exclusivamente como saldo a favor (crédito) en la cuenta del usuario.

## Aplicación para Empleados / Validación
* Los empleados deben poder escanear los códigos QR generados para validar el ingreso a las salas y/o entregar los productos del Candy Bar.
* El código QR debe quedar invalidado de forma automática tras su escaneo.
* Debe existir una opción para ingresar manualmente el código del boleto en caso de fallas con el lector de QR.
