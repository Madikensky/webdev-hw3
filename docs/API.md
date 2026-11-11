# Site-Tracker API

REST API for managing telecom sites, the equipment installed on them and their inspections. All bodies are JSON.

- **Base URL:** `http://localhost:3000`
- **Content-Type:** `application/json` for requests with a body

**27 endpoints** across 5 resources:

| # | Method | Path | Description | Success |
|---|---|---|---|---|
| 1 | GET | `/health` | Liveness + database check | 200 |
| 2 | GET | `/api/cities` | List cities | 200 |
| 3 | GET | `/api/cities/:id` | Get one city | 200 |
| 4 | POST | `/api/cities` | Create a city | 201 |
| 5 | PATCH | `/api/cities/:id` | Update a city | 200 |
| 6 | DELETE | `/api/cities/:id` | Delete a city | 204 |
| 7 | GET | `/api/cities/:id/sites` | Sites in a city | 200 |
| 8 | GET | `/api/sites` | List sites | 200 |
| 9 | GET | `/api/sites/:id` | Get one site | 200 |
| 10 | POST | `/api/sites` | Create a site | 201 |
| 11 | PUT | `/api/sites/:id` | Replace a site | 200 |
| 12 | PATCH | `/api/sites/:id` | Partially update a site | 200 |
| 13 | DELETE | `/api/sites/:id` | Delete a site | 204 |
| 14 | GET | `/api/sites/:id/equipment` | Equipment of a site | 200 |
| 15 | POST | `/api/sites/:id/equipment` | Add equipment to a site | 201 |
| 16 | GET | `/api/sites/:id/inspections` | Inspections of a site | 200 |
| 17 | POST | `/api/sites/:id/inspections` | Record an inspection of a site | 201 |
| 18 | GET | `/api/equipment` | List equipment | 200 |
| 19 | GET | `/api/equipment/:id` | Get one piece of equipment | 200 |
| 20 | PUT | `/api/equipment/:id` | Replace equipment | 200 |
| 21 | PATCH | `/api/equipment/:id` | Partially update / move equipment | 200 |
| 22 | DELETE | `/api/equipment/:id` | Delete equipment | 204 |
| 23 | GET | `/api/inspections` | List inspections | 200 |
| 24 | GET | `/api/inspections/:id` | Get one inspection | 200 |
| 25 | PATCH | `/api/inspections/:id` | Update an inspection | 200 |
| 26 | DELETE | `/api/inspections/:id` | Delete an inspection | 204 |
| 27 | GET | `/api/stats/overview` | Dashboard numbers | 200 |

## Data model

```
City 1 ──< Site 1 ──< Equipment
                  1 ──< Inspection
```

- A **city** has many sites; a site belongs to at most one city.
- A **site** has many pieces of **equipment** and many **inspections**; each of them belongs to exactly one site.

| Relationship | When the parent is deleted |
|---|---|
| City → Sites | refused with 409 while the city still has sites |
| Site → Equipment, Inspections | refused with 409 unless `?force=true`; then they are deleted with the site |

---

## Conventions

### Path parameters
`:id` must be a positive integer, otherwise **400** (`/api/sites/abc`).

### Lists, paging, sorting
Every list endpoint accepts:

| Query | Type | Default | Notes |
|---|---|---|---|
| `page` | integer | `1` | ≥ 1 |
| `limit` | integer | `20` | 1–100 |
| `order` | `ASC` \| `DESC` | `ASC` (`DESC` for inspections) | |

and returns:

```json
{
  "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

An invalid query value (e.g. `limit=500`, `sort=price`) → **400**. Unknown query parameters are rejected too.

### PUT vs PATCH
- **PUT** sends the full object (same rules as POST). Optional fields left out are reset: `null`, or the default (`status` → `active` for sites, `working` for equipment).
- **PATCH** changes only the fields you send. An empty body `{}` → 400. Required fields can't be set to `null`.

### Validation
- Strings are trimmed; a required string can't be empty.
- Unknown fields in the body → 400.
- Dates are `YYYY-MM-DD` and must exist (`2026-02-30` is rejected). Dates are returned the same way.
- `status`, `type`, `result` accept only the values listed below.

### Error format
Every error has the same shape:

```json
{
  "error": {
    "status": 400,
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "status", "messages": ["Invalid option: expected one of \"active\"|\"inactive\"|\"under_construction\"|\"decommissioned\""] }
    ]
  }
}
```

`details` appears only for field-level problems; a missing required field gives `"messages": ["is required"]`.

| Status | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | body or query fails validation |
| 400 | `BAD_REQUEST` | malformed JSON, invalid `:id`, empty PATCH body, a body field points to a record that doesn't exist (`cityId`, `siteId`), `from` later than `to` |
| 404 | `NOT_FOUND` | the record in the URL doesn't exist; unknown route |
| 409 | `CONFLICT` | duplicate city name / serial number; deleting a city or site that still has dependants |
| 500 | `INTERNAL_SERVER_ERROR` | unexpected error (details are logged, not returned) |

> **400 or 404 for a missing related record?** If it's in the **URL** (`POST /api/sites/999/equipment`) → 404. If it's in the **body** (`"cityId": 999`) the URL is fine, so → 400 with a `details` entry.

---

## Objects

### City
| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `name` | string | required, 1–100 chars, unique (case-insensitive) |
| `region` | string \| null | optional, ≤ 100 chars |
| `siteCount` | integer | read-only |
| `createdAt`, `updatedAt` | timestamp | read-only |

```json
{ "id": 1, "name": "Almaty", "region": "Almaty", "createdAt": "2026-11-11T11:33:18.425Z", "updatedAt": "2026-11-11T11:33:18.425Z", "siteCount": 2 }
```

### Site
| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `name` | string | required, 1–255 chars |
| `address` | string \| null | optional, ≤ 500 chars |
| `cityId` | integer \| null | optional, must be an existing city |
| `status` | string | `active` (default), `inactive`, `under_construction`, `decommissioned` |
| `city` | City \| null | read-only, embedded |
| `equipmentCount`, `faultyEquipmentCount`, `inspectionCount` | integer | read-only |
| `lastInspection` | `{ id, inspectedAt, result }` \| null | read-only, most recent by date |
| `createdAt`, `updatedAt` | timestamp | read-only |

```json
{
  "id": 1,
  "name": "Central Tower",
  "address": "12 Abay Ave",
  "cityId": 1,
  "status": "active",
  "createdAt": "2026-11-11T11:33:18.430Z",
  "updatedAt": "2026-11-11T11:33:18.430Z",
  "city": { "id": 1, "name": "Almaty", "region": "Almaty", "createdAt": "2026-11-11T11:33:18.425Z", "updatedAt": "2026-11-11T11:33:18.425Z" },
  "equipmentCount": 3,
  "faultyEquipmentCount": 1,
  "inspectionCount": 2,
  "lastInspection": { "id": 2, "inspectedAt": "2026-10-20", "result": "needs_attention" }
}
```

### Equipment
| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `type` | string | required: `antenna`, `router`, `switch`, `power_unit`, `battery`, `other` |
| `model` | string | required, 1–100 chars |
| `serialNumber` | string | required, 1–100 chars, unique |
| `status` | string | `working` (default), `faulty`, `decommissioned` |
| `installedAt` | date \| null | optional, `YYYY-MM-DD` |
| `siteId` | integer | read-only here; change it with PATCH |
| `site` | `{ id, name }` | read-only |
| `createdAt`, `updatedAt` | timestamp | read-only |

```json
{
  "id": 1, "siteId": 1, "type": "antenna", "model": "Huawei AAU5613", "serialNumber": "HW-AAU-0001",
  "status": "working", "installedAt": "2025-03-12",
  "createdAt": "2026-11-11T11:33:18.434Z", "updatedAt": "2026-11-11T11:33:18.434Z",
  "site": { "id": 1, "name": "Central Tower" }
}
```

### Inspection
| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `inspector` | string | required, 1–100 chars |
| `inspectedAt` | date | required, `YYYY-MM-DD` |
| `result` | string | required: `passed`, `needs_attention`, `failed` |
| `notes` | string \| null | optional, ≤ 2000 chars |
| `siteId` | integer | read-only |
| `site` | `{ id, name }` | read-only |
| `createdAt`, `updatedAt` | timestamp | read-only |

```json
{
  "id": 2, "siteId": 1, "inspector": "Daniyar K.", "inspectedAt": "2026-10-20", "result": "needs_attention",
  "notes": "Router fans are noisy; replacement scheduled.",
  "createdAt": "2026-11-11T11:33:18.437Z", "updatedAt": "2026-11-11T11:33:18.437Z",
  "site": { "id": 1, "name": "Central Tower" }
}
```

---

## Health

### GET /health
Not part of `/api`; used for health checks.

**Response 200** `{ "status": "ok", "database": "up" }` — or **503** `{ "status": "degraded", "database": "down" }`.

```bash
curl http://localhost:3000/health
```

---

## Cities

### GET /api/cities
Cities sorted by name, each with `siteCount`. Query: `page`, `limit`, `order`.

**Response 200** — paginated list of City objects.

```bash
curl "http://localhost:3000/api/cities?limit=10"
```

### GET /api/cities/:id
**Responses:** `200` City · `400` invalid id · `404` not found.

### POST /api/cities
**Body**
```json
{ "name": "Aktau", "region": "Mangystau" }
```
`name` is required; `region` is optional.

**Responses:** `201` the created City (+ `Location` header) · `400` validation · `409` name already exists.

```bash
curl -X POST http://localhost:3000/api/cities -H "Content-Type: application/json" \
  -d '{"name":"Aktau","region":"Mangystau"}'
```

### PATCH /api/cities/:id
Any of `name`, `region` (at least one).

**Responses:** `200` updated City · `400` · `404` · `409` name taken.

### DELETE /api/cities/:id
**Responses:** `204` · `404` · `409` the city still has sites.

### GET /api/cities/:id/sites
Sites in this city. Same query as `GET /api/sites` except `cityId`.

**Responses:** `200` paginated list of Sites · `400` · `404` city not found.

---

## Sites

### GET /api/sites
| Query | Type | Description |
|---|---|---|
| `search` | string | name **or** address contains the text (case-insensitive) |
| `status` | string | one of the site statuses |
| `cityId` | integer | only sites in this city |
| `sort` | string | `id` (default), `name`, `createdAt` |
| `page`, `limit`, `order` | | see *Lists* |

**Response 200** — paginated list of Site objects (with `city` and the counters).

```bash
curl "http://localhost:3000/api/sites?search=tower&status=active"
```

### GET /api/sites/:id
**Responses:** `200` Site · `400` invalid id · `404` not found (`{ "error": { "status": 404, "code": "NOT_FOUND", "message": "Site with id 999 not found" } }`).

### POST /api/sites
**Body**
```json
{ "name": "North Plant", "address": "5 Lenin St", "cityId": 2, "status": "active" }
```
`name` is required. `address`, `cityId` and `status` are optional (`status` defaults to `active`).

**Responses:** `201` the created Site (+ `Location` header) · `400` validation, or `cityId` doesn't exist.

```bash
curl -X POST http://localhost:3000/api/sites -H "Content-Type: application/json" \
  -d '{"name":"North Plant","cityId":2}'
```

### PUT /api/sites/:id
Replaces the site's fields. Send the full object: omitted `address` / `cityId` become `null`, omitted `status` becomes `active`.

**Responses:** `200` updated Site · `400` · `404`.

### PATCH /api/sites/:id
Any subset of `name`, `address`, `cityId`, `status` (at least one). `cityId: null` removes the site from its city.

```json
{ "status": "inactive" }
```

**Responses:** `200` updated Site · `400` · `404`.

### DELETE /api/sites/:id
| Query | Description |
|---|---|
| `force` | `true` also deletes the site's equipment and inspections; `false` (default) refuses if there are any |

**Responses:** `204` · `400` (invalid id or `force`) · `404` · `409`:
```json
{ "error": { "status": 409, "code": "CONFLICT", "message": "Site 1 still has 3 equipment item(s) and 2 inspection(s). Delete them first, or pass ?force=true to delete them together with the site." } }
```

### GET /api/sites/:id/equipment
Equipment of one site. Query: same as `GET /api/equipment` except `siteId`.

**Responses:** `200` paginated list of Equipment · `400` · `404` site not found.

### POST /api/sites/:id/equipment
**Body**
```json
{ "type": "router", "model": "Cisco ASR 920", "serialNumber": "CS-ASR-0099", "status": "working", "installedAt": "2026-09-30" }
```
`type`, `model` and `serialNumber` are required.

**Responses:** `201` the created Equipment (+ `Location`) · `400` validation · `404` site not found · `409` serial number already used.

```bash
curl -X POST http://localhost:3000/api/sites/1/equipment -H "Content-Type: application/json" \
  -d '{"type":"router","model":"Cisco ASR 920","serialNumber":"CS-ASR-0099"}'
```

### GET /api/sites/:id/inspections
Inspections of one site, newest first. Query: same as `GET /api/inspections` except `siteId`.

**Responses:** `200` paginated list of Inspections · `400` · `404` site not found.

### POST /api/sites/:id/inspections
**Body**
```json
{ "inspector": "Aigerim S.", "inspectedAt": "2026-11-05", "result": "passed", "notes": "All systems normal." }
```
`inspector`, `inspectedAt` and `result` are required.

**Responses:** `201` the created Inspection (+ `Location`) · `400` validation · `404` site not found.

---

## Equipment

### GET /api/equipment
| Query | Type | Description |
|---|---|---|
| `siteId` | integer | only equipment of this site |
| `type` | string | one of the equipment types |
| `status` | string | `working`, `faulty`, `decommissioned` |
| `search` | string | model or serial number contains the text |
| `sort` | string | `id` (default), `model`, `installedAt`, `createdAt` |
| `page`, `limit`, `order` | | see *Lists* |

**Response 200** — paginated list of Equipment.

```bash
curl "http://localhost:3000/api/equipment?status=faulty"
```

### GET /api/equipment/:id
**Responses:** `200` Equipment · `400` · `404`.

### PUT /api/equipment/:id
Full replacement of `type`, `model`, `serialNumber`, `status`, `installedAt` (same body rules as creating). Omitted `status` → `working`, omitted `installedAt` → `null`. The site is not changed (use PATCH to move).

**Responses:** `200` · `400` · `404` · `409` serial number used by other equipment.

### PATCH /api/equipment/:id
Any subset of `type`, `model`, `serialNumber`, `status`, `installedAt`, `siteId` (at least one). Sending `siteId` moves the equipment to another site.

```json
{ "status": "faulty" }
```

**Responses:** `200` updated Equipment · `400` (validation, or the new `siteId` doesn't exist) · `404` · `409`.

### DELETE /api/equipment/:id
**Responses:** `204` · `400` · `404`.

---

## Inspections

### GET /api/inspections
| Query | Type | Description |
|---|---|---|
| `siteId` | integer | only inspections of this site |
| `result` | string | `passed`, `needs_attention`, `failed` |
| `from`, `to` | date | inclusive range on `inspectedAt` (`from` must not be after `to`) |
| `sort` | string | `inspectedAt` (default), `id`, `createdAt` |
| `page`, `limit`, `order` | | see *Lists* (newest first by default) |

**Response 200** — paginated list of Inspections.

```bash
curl "http://localhost:3000/api/inspections?result=failed&from=2026-10-01"
```

### GET /api/inspections/:id
**Responses:** `200` Inspection · `400` · `404`.

### PATCH /api/inspections/:id
Any subset of `inspector`, `inspectedAt`, `result`, `notes` (at least one).

**Responses:** `200` updated Inspection · `400` · `404`.

### DELETE /api/inspections/:id
**Responses:** `204` · `400` · `404`.

---

## Stats

### GET /api/stats/overview
Numbers for a dashboard. `needingAttention` counts **active** sites that have faulty equipment or whose latest inspection is `failed` / `needs_attention`. `inspectionsLast30Days` counts inspections whose date is within the last 30 days.

**Response 200**
```json
{
  "sites": {
    "total": 5,
    "byStatus": { "active": 2, "inactive": 1, "under_construction": 1, "decommissioned": 1 },
    "needingAttention": 1
  },
  "equipment": {
    "total": 6,
    "byStatus": { "working": 5, "faulty": 1, "decommissioned": 0 },
    "byType": { "antenna": 2, "router": 1, "switch": 1, "power_unit": 1, "battery": 1, "other": 0 }
  },
  "inspectionsLast30Days": { "passed": 0, "needs_attention": 1, "failed": 1 },
  "sitesByCity": [
    { "cityId": 1, "city": "Almaty", "siteCount": 2 }
  ]
}
```
