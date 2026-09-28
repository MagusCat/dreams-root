# Base de datos

Guarda las respuestas del estudio de forma **anónima**: cada participante entra con
un usuario anónimo y solo puede ver y escribir sus propios datos (RLS). Identificadores
en inglés; documentación en español.

Qué se guarda: datos académicos, hábitos digitales y de estudio, uso de IA, las
escalas MAAS y PPS (ítem por ítem) y la prueba de atención (CPT). Los catálogos
(carreras, dispositivos, formatos, herramientas de IA, etc.) se cargan desde `seed.sql`.

## Aplicar

**Local (Docker):**

```bash
supabase start
supabase db reset        # recrea la base y carga el seed
```

**Remoto (Supabase Cloud):**

```bash
supabase link --project-ref <TU_PROJECT_REF>
supabase db push                             # aplica migraciones
psql "$DATABASE_URL" -f supabase/seed.sql    # carga catálogos (db push no lo hace)
```

> Rehacer todo en remoto desde cero: `supabase db reset --linked` (⚠️ borra los datos).

## Vistas (solo equipo)

- `v_analysis_dataset` — una fila por participante **completado** (formato ancho, para análisis).
- `v_responses_long` — una fila por **respuesta** individual, de todos los participantes
  (respuestas resueltas a nombres de catálogo; los ítems de escala salen con su valor 1–N).
- `v_progress` — una fila por participante para **ver el avance** de cada encuesta
  (secciones hechas, ítems MAAS/PPS, `sections_done`, `pct_complete`).

## Pendientes

- **Centros universitarios** (`seed.sql`): son placeholder; poner la lista real.
- **Carrera → área**: algunas asignaciones son opinables; revisar `fk_area` en `seed.sql`.
- **Puntajes MAAS/PPS**: la vista `v_analysis_dataset` expone suma/media crudas;
  aplicar la corrección de cada manual en el análisis (ver `docs/instruments.md`).
- **Huella de dispositivo**: es señal blanda anti-duplicados (no identidad); está en
  el consentimiento y requiere aval de ética antes de recolectar.
