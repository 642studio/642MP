# Rider V1 Pro (sin assets)

Formato visual corporativo 642 con salida PDF multipágina A4.

## Secciones

1. Portada
- marca 642
- cliente
- campaña mensual
- periodo

2. Fecha y horario
- fecha
- hora inicio/fin
- duración estimada
- locación

3. Entregables finales
- tabla `entregable | formato | tiempo de entrega`

4. Objetivo de sesión
- resumen
- bullets clave

5. Responsabilidades
- cliente
- 642 Studio

6. Línea de producción
- foto: `área | responsable | especificación`
- reels: `área | responsable | especificación`

7. Plazos de entrega
- tabla `item | fecha`

8. Requerimientos extra

9. Confirmación final del cliente

## Reglas de estatus

- `sent`: requiere secciones mínimas completas.
- `approved`: guarda `approved_at` y `approved_by`.

## Render

- CSS con `@media print` y saltos explícitos por página.
- Generación server-side en `generate-rider-pdf`.
- PDF guardado en bucket `riders-pdf`.
