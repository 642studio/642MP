# 642MP / 642MediaPlanner

Versión productiva inicial de 642MP para operación de agencia creativa con jerarquía estratégica:

- `Objetivo General (cliente/servicio)`
- `Plan Semestral (inicio/fin fijo)`
- `Campaña Mensual`

Incluye `Rider Builder Pro` con exportación PDF multipágina vía Edge Function.

## Stack

- Frontend: React + Vite + TypeScript
- Data/Auth: Supabase (Postgres + Auth + RLS + Storage)
- Server Functions: Supabase Edge Functions (`generate-rider-pdf`, `ai-feed-suggestions`)

## Estructura

- `src/`: aplicación web
- `supabase/migrations/`: esquema SQL y reglas de negocio
- `supabase/functions/`: funciones de IA y PDF
- `legacy/`: versión anterior demo (localStorage)
- `scripts/import-legacy-json.ts`: importador de datos legacy

## Requisitos

- Node.js 20+
- Proyecto Supabase
- Bucket público `riders-pdf` en Storage

## Configuración local

1. Instala dependencias:

```bash
npm install
```

2. Crea `.env` desde `.env.example`:

```bash
cp .env.example .env
```

3. Configura:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

4. Ejecuta:

```bash
npm run dev
```

## Migración DB

Aplica la migración:

- `supabase/migrations/20260514193000_core_productive.sql`

Esta migración incluye:

- modelos de negocio
- validaciones (mes dentro del semestre)
- no solapamiento de semestres activos
- auditoría de estados
- RLS por rol

## Edge Functions

### `generate-rider-pdf`

Input:

```json
{ "rider_id": "uuid" }
```

Output:

```json
{ "pdf_url": "https://...", "path": "riders-pdf/..." }
```

### `ai-feed-suggestions`

Input:

```json
{
  "campaign_id": "uuid",
  "missing_deliverables": [
    { "type": "Reel", "missing": 2 }
  ]
}
```

Output:

```json
{
  "mode": "live",
  "suggestions": []
}
```

Si no hay API Key en `settings` devuelve modo demo con mensaje de configuración.

## Importar datos legacy

1. Exporta el JSON del estado viejo (`642mp_v1`) a un archivo local.
2. Ejecuta:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run import:legacy -- ./legacy-state.json
```

## Estado de implementación

### Fase 1 (implementada)

- Base Vite/TS
- Supabase auth + `profiles`
- Jerarquía estratégica (`objective_generals`, `semester_plans`, `monthly_campaigns`)
- Workspace con trazabilidad
- Rider Builder Pro V1
- Edge Function PDF
- Importador legacy

### Fase 2 (pendiente)

- Aprobaciones y reportes internos 100% integrados al nuevo modelo
- IA feed suggestions en UI con preview editable
- Auditoría visual dentro de la app

### Fase 3 (pendiente)

- hardening de performance
- pruebas de concurrencia completas
- manual operativo y checklist release
