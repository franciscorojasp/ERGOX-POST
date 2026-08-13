# Checklist de verificación manual — ERGOX Post v3.0

## Instalación / PWA
- [ ] `npm run check` y `npm test` pasan sin errores.
- [ ] La app carga con servidor local (módulos ES) y en GitHub Pages.
- [ ] Se puede instalar como PWA (Chrome: icono de instalar) y abre en modo standalone.
- [ ] Con DevTools sin conexión: la app carga offline y muestra el banner "Sin conexión".

## Login / Registro
- [ ] No aparecen credenciales visibles en la pantalla de login.
- [ ] Login demo (Admin/Empresa) funciona en modo local.
- [ ] Registro nuevo: exige nombre, email válido y contraseña ≥8 (letras+números); da 10 créditos.
- [ ] Registro con email duplicado da error claro.
- [ ] El referido suma +5 al referente y +10 al nuevo.
- [ ] Contraseña incorrecta da "Credenciales inválidas".

## Generador
- [ ] Cambiar país cambia normativa, temas y bandera; el calendario y créditos usan el mismo país.
- [ ] Generar post descuenta 1 crédito (chip actualiza) y muestra vista previa con hashtags.
- [ ] Los montos de sanciones cambian según país/año (ej. VE "de 30 a 100 UT (≈ …)").
- [ ] El pie incluye datos de la empresa configurada y el descargo legal.
- [ ] Copiar, WhatsApp (abre con el teléfono de la empresa si está configurado) y Telegram (con url correcta) funcionan.
- [ ] Placa visual: se generan los 3 layouts, los 3 formatos y se descarga PNG; el logo no rompe si falla la carga.

## Historial
- [ ] Guardar métricas (alcance/likes/comentarios) persiste y se refleja en Informe.
- [ ] Exportar todo descarga .txt; borrar todo pide confirmación.

## Leads
- [ ] Crear lead magnet genera link `lead.html?id=…` copiado al portapapeles.
- [ ] Abrir el link en otra pestaña: el formulario exige consentimiento; al enviar, el lead aparece en la pestaña Leads con badge "Consentimiento".
- [ ] Sin consentimiento el envío se bloquea.
- [ ] Exportar leads genera CSV con campos correctos.

## Calendario / Planner
- [ ] El calendario muestra el año actual, fechas recurrentes y contador de días / VENCIDO.
- [ ] Botón "Post" carga el tema en el generador.
- [ ] Recordatorios: pedir permiso de notificaciones y mostrar notificación.
- [ ] Planner: cuadrícula mensual, navegación de mes, mezcla 40/35/25, export CSV, clic en día lleva el tema al generador.

## Créditos / Pagos
- [ ] Comprar plan crea transacción PENDIENTE y abre WhatsApp con referencia.
- [ ] Admin → Pagos pendientes → Confirmar: los créditos se acreditan y el movimiento queda PAGADO.
- [ ] Botón "Recibo" en el movimiento PAGADO imprime el recibo A4 con IVA/IGV y conversión local.
- [ ] Parámetros (UT, SMMLV, UMA, UIT, UTM, tasa Bs, disclaimer) se guardan y se reflejan en las publicaciones.

## Admin
- [ ] Listar usuarios, +50 créditos, bloquear/activar (el bloqueado no vuelve a entrar), crear usuario con rol.
- [ ] Exportar estado JSON descarga el respaldo.
- [ ] Resetear datos locales: limpia todo y vuelve al login.
- [ ] Informe: ingresos por plan, posts por país/tipo, transacciones y exports CSV.

## Seguridad
- [ ] En el estado guardado no existen contraseñas en claro (solo hash+salt).
- [ ] Pega `javascript:alert(1)` en el logo → se rechaza; en el tema → se muestra escapado (sin ejecutarse).
- [ ] Un EDITOR no ve las pestañas Admin/Informe ni puede confirmar pagos.
- [ ] En modo nube, la API key equivocada responde "API key inválida" (error claro en consola).

## Modo nube (tras desplegar Code.gs)
- [ ] Registrar usuario en nube y verificar que aparece en USERS de la hoja.
- [ ] Un post guardado aparece en POSTS y se restaura al recargar en otro dispositivo con la misma sesión.
- [ ] Con el backend apagado, la app inicia en modo local sin romper (banner/estado).
