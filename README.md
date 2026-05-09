# api-server — Polla Mundialista 2026

API REST central en NestJS + PostgreSQL (o SQLite en dev).

## Stack
- NestJS + TypeScript
- TypeORM + PostgreSQL (producción) / SQLite (desarrollo)
- JWT Auth (superadmin + campaign_admin)
- ExcelJS para exportaciones

## Endpoints

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Login → devuelve JWT |
| GET  | /api/auth/me | Usuario actual |

### Campañas (superadmin)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | /api/campaigns | Listar campañas |
| POST   | /api/campaigns | Crear campaña |
| PUT    | /api/campaigns/:id | Actualizar campaña |
| DELETE | /api/campaigns/:id | Eliminar campaña |

### Usuarios (superadmin)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | /api/users | Listar usuarios |
| POST   | /api/users | Crear usuario |
| PUT    | /api/users/:id | Actualizar usuario |
| POST   | /api/users/seed-superadmin | Crear superadmin inicial |

### Tótems
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | /api/totems | Listar tótems |
| GET    | /api/totems/dashboard | Estado de tótems |
| POST   | /api/totems | Registrar tótem (superadmin) |
| PUT    | /api/totems/:id | Actualizar tótem (superadmin) |

### Fases
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | /api/phases?campaign_id= | Listar fases |
| POST   | /api/phases | Crear fase (superadmin) |
| POST   | /api/phases/:id/publish | Publicar fase → tótems se actualizan |
| POST   | /api/phases/:id/unpublish | Desactivar fase |

### Partidos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | /api/matches?phase_id= | Partidos de una fase |
| POST   | /api/matches | Crear partido |
| POST   | /api/matches/bulk | Crear múltiples partidos |
| PUT    | /api/matches/:id/teams | Actualizar equipos |
| PUT    | /api/matches/:id/result | Cargar resultado → calcula ganadores |

### Participantes y Registros
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | /api/participants | Listar participantes |
| GET    | /api/registrations | Listar registros |
| GET    | /api/registrations/winners | Lista de ganadores |
| GET    | /api/registrations/stats | Estadísticas |
| GET    | /api/registrations/export | Exportar Excel .xlsx |

### Sincronización de Tótems (sin JWT)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST   | /api/sync/heartbeat | El tótem reporta que está vivo |
| GET    | /api/sync/data/:totem_code?version= | Descarga fase activa y partidos |
| GET    | /api/sync/factura/:totem_code/:factura | Verifica si factura está disponible |
| POST   | /api/sync/push/:totem_code | Sube registros del tótem al servidor |

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Crear .env basado en .env.example
cp .env.example .env
# (editar .env con tus valores locales)

# Desarrollo con SQLite (sin necesidad de PostgreSQL)
# Solo omitir DATABASE_URL en .env y usará SQLite automáticamente

# Iniciar en modo desarrollo
npx ts-node -r tsconfig-paths/register src/main.ts

# Crear superadmin inicial
curl -X POST http://localhost:3000/api/users/seed-superadmin
```

## Deploy en Railway

1. Sube este repositorio a GitHub
2. En Railway: New Project → Deploy from GitHub
3. Agrega servicio PostgreSQL al proyecto
4. Configura variables de entorno (ver .env.example)
5. Railway detecta el Procfile y hace el build automáticamente
6. Una vez desplegado, llama a `/api/users/seed-superadmin` para crear el superadmin

## Sistema de reglas por fase

| Fase | Número | Predicciones | Mín. aciertos para ganar |
|------|--------|-------------|--------------------------|
| Grupos | 1 | 3 de 72 | 3 exactas |
| 16avos | 2 | 16 | 3 exactas |
| 8avos | 3 | 8 | 2 exactas |
| 4tos | 4 | 4 | 2 exactas |
| Semis | 5 | 2 | 2 exactas |
| Final | 6 | 1 | 1 exacta |

## Flujo de cambio de fase

1. Superadmin crea la nueva fase con los equipos clasificados (POST /api/phases)
2. Agrega los partidos (POST /api/matches/bulk)
3. Publica la fase (POST /api/phases/:id/publish)
4. Los tótems detectan el cambio en el próximo heartbeat/sync
5. Descargan la nueva fase automáticamente
6. El dashboard muestra qué tótems ya se actualizaron
