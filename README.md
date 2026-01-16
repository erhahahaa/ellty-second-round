# Calculation Tree

A full-stack TypeScript application for creating and exploring mathematical calculation trees. Built with modern technologies and Domain-Driven Design principles.

## Overview

Calculation Tree allows users to start with a number (root) and apply mathematical operations that form a tree structure. Think of it like a social discussion platform, but instead of posts and comments, you have starting numbers and mathematical operations.

**Example:**
```
Root: 100
├── + 50 = 150 (by user1)
│   ├── × 2 = 300 (by user2)
│   └── - 30 = 120 (by user3)
└── ÷ 4 = 25 (by user4)
    └── + 75 = 100 (by user5)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TanStack Start (SSR), TanStack Router, TailwindCSS 4, shadcn/ui |
| **Backend** | Hono, oRPC (type-safe APIs with OpenAPI) |
| **Database** | PostgreSQL, Drizzle ORM |
| **Caching** | Redis (production), Cloudflare KV (workers), In-memory (development) |
| **Auth** | Better-Auth (email/password with username plugin) |
| **Runtime** | Bun, Cloudflare Workers |
| **Build** | Turborepo (monorepo), Biome (lint/format) |
| **Deployment** | Alchemy (Cloudflare) |

## Project Structure

```
ellty-second-round/
├── apps/
│   ├── web/                    # Frontend (React + TanStack Start)
│   │   ├── src/
│   │   │   ├── routes/         # File-based routing (index, login, register, about)
│   │   │   ├── components/     # UI components (calculation tree, shadcn/ui)
│   │   │   └── lib/            # Auth client, oRPC client
│   │   └── Dockerfile
│   └── server/                 # Backend API (Hono + oRPC)
│       ├── src/
│       │   └── index.ts        # Server entrypoint, route handlers
│       └── Dockerfile
├── packages/
│   ├── api/                    # Business logic (Domain-Driven Design)
│   │   └── src/
│   │       ├── domain/
│   │       │   ├── entities/           # CalculationRoot, CalculationOperation
│   │       │   ├── value-objects/      # Operator (ADD, SUBTRACT, MULTIPLY, DIVIDE)
│   │       │   ├── services/           # CalculationService (orchestration)
│   │       │   └── repositories/       # Repository interfaces, cache interfaces
│   │       ├── infrastructure/
│   │       │   ├── persistence/        # Drizzle repository, Unit of Work
│   │       │   ├── cache/              # Redis, KV, Memory cache implementations
│   │       │   └── container.ts        # Dependency injection
│   │       └── routers/                # oRPC route handlers
│   ├── auth/                   # Better-Auth configuration
│   ├── db/                     # Drizzle schema & migrations
│   │   └── src/
│   │       ├── schema/                 # auth.ts, calculation.ts
│   │       └── migrations/             # Database migrations
│   ├── env/                    # Type-safe environment variables (@t3-oss/env-core)
│   ├── config/                 # Shared TypeScript configuration
│   └── infra/                  # Alchemy deployment configuration
├── compose.yml                 # Docker Compose (Postgres, Redis, apps)
├── turbo.json                  # Turborepo task configuration
└── biome.json                  # Linting and formatting rules
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3.5+
- PostgreSQL 17+
- Redis 8+ (optional for development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ellty-second-round

# Install dependencies
bun install
```

### Environment Setup

Create environment files for the server:

```bash
# apps/server/.env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/main
CORS_ORIGIN=http://localhost:3001
BETTER_AUTH_SECRET=your-secret-key-min-16-chars
BETTER_AUTH_URL=http://localhost:3000
```

Create environment files for the web app:

```bash
# apps/web/.env
VITE_SERVER_URL=http://localhost:3000
```

### Database Setup

**Option 1: Using Docker (Recommended)**

```bash
# Start PostgreSQL and Redis
docker compose up -d postgres redis
```

**Option 2: Local PostgreSQL**

Ensure PostgreSQL is running and create a database named `main`.

**Apply Database Schema**

```bash
bun run db:push
```

### Running the Application

**Development Mode**

```bash
# Start all apps (web + server)
bun run dev

# Or start individually
bun run dev:web     # Frontend on http://localhost:3001
bun run dev:server  # Backend on http://localhost:3000
```

**Using Docker Compose (Full Stack)**

```bash
docker compose up
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- Server on port 3000
- Web on port 3001

## API Reference

### Endpoints

All RPC endpoints are available at `/rpc/*` and OpenAPI reference at `/api-reference/*`.

| Endpoint | Auth | Description |
|----------|------|-------------|
| `calculation.getFullTree` | Public | Get all calculation trees with nested operations |
| `calculation.getRootById` | Public | Get a single root with its operation tree |
| `calculation.createRoot` | Protected | Create a new calculation root (starting number) |
| `calculation.createOperation` | Protected | Create an operation on a root or another operation |
| `healthCheck` | Public | Health check endpoint |
| `privateData` | Protected | Test endpoint returning user data |

### Authentication

Better-Auth endpoints are available at `/api/auth/*`:
- `POST /api/auth/sign-up/email` - Register with email/password
- `POST /api/auth/sign-in/email` - Login
- `GET /api/auth/session` - Get current session
- `POST /api/auth/sign-out` - Logout

### Example API Usage

**Create a Root**
```typescript
// Using oRPC client
const root = await client.calculation.createRoot({
  value: 100
});
// Returns: { id, value: 100, userId, username, createdAt, updatedAt, operations: [] }
```

**Create an Operation**
```typescript
const operation = await client.calculation.createOperation({
  parentRootId: "root-uuid",  // OR parentOperationId
  operator: "ADD",            // ADD | SUBTRACT | MULTIPLY | DIVIDE
  operand: 50
});
// Returns: { id, parentRootId, operator, operand, result: 150, ... }
```

**Get Full Tree**
```typescript
const trees = await client.calculation.getFullTree();
// Returns array of roots with nested operations
```

## Database Schema

### Tables

**calculation_root**
| Column | Type | Description |
|--------|------|-------------|
| id | text (UUID) | Primary key |
| value | numeric(20,10) | Starting number |
| user_id | text | Foreign key to user |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

**calculation_operation**
| Column | Type | Description |
|--------|------|-------------|
| id | text (UUID) | Primary key |
| parent_root_id | text | FK to calculation_root (nullable) |
| parent_operation_id | text | FK to self (nullable, for nesting) |
| operator | enum | ADD, SUBTRACT, MULTIPLY, DIVIDE |
| operand | numeric(20,10) | The number to apply |
| result | numeric(20,10) | Computed result |
| user_id | text | Foreign key to user |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

### Migrations

```bash
# Generate new migration
bun run db:generate

# Apply migrations
bun run db:migrate

# Push schema directly (development)
bun run db:push

# Open Drizzle Studio
bun run db:studio
```

## Architecture

### Domain-Driven Design

The `packages/api` follows DDD principles:

**Entities**
- `CalculationRoot` - Aggregate root representing a starting number
- `CalculationOperation` - Operations forming tree nodes

**Value Objects**
- `Operator` - Immutable mathematical operation type with validation

**Services**
- `CalculationService` - Application service orchestrating business logic

**Repositories**
- `ICalculationRepository` - Interface for data persistence
- `ICacheRepository` - Interface for caching

### Patterns Used

| Pattern | Implementation |
|---------|---------------|
| **Unit of Work** | Transaction management with `DrizzleUnitOfWork` |
| **Cache-Aside** | Check cache → DB fetch → cache result |
| **Dependency Injection** | `createContainer()` wires all dependencies |
| **Resilient Cache** | `ResilientCacheWrapper` handles cache failures gracefully |

### Caching Strategy

The application uses a tiered caching approach:

1. **Cloudflare KV** - Used in Cloudflare Workers environment
2. **Redis** - Used in production server environment
3. **In-Memory** - Used in development/testing

Cache keys:
- `full_tree` - All roots with operations
- `root:{id}` - Individual root with operations
- `operation:{id}` - Individual operation

## Deployment

### Cloudflare Workers (via Alchemy)

```bash
# Deploy to production
bun run deploy

# Deploy to staging
cd packages/infra && bun alchemy deploy --stage staging

# Destroy environment
bun run destroy
```

### Environment Variables for Production

**Server Bindings:**
```
NODE_ENV=production
DATABASE_URL=postgres://...
CORS_ORIGIN=https://your-domain.com
BETTER_AUTH_SECRET=your-production-secret
BETTER_AUTH_URL=https://api.your-domain.com
```

**Web Bindings:**
```
VITE_SERVER_URL=https://api.your-domain.com
```

### CI/CD (GitHub Actions)

The project includes automated deployment via `.github/workflows/deploy.yml`:

- **Push to main** → Deploy to production
- **Pull Request** → Deploy preview environment
- **PR Closed** → Cleanup preview environment

Required GitHub Secrets:
- `ALCHEMY_PASSWORD`
- `ALCHEMY_STATE_TOKEN`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_EMAIL`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`

Required GitHub Variables:
- `NODE_ENV`
- `CORS_ORIGIN`
- `BETTER_AUTH_URL`
- `VITE_SERVER_URL`

## Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start all apps in development mode |
| `bun run build` | Build all applications |
| `bun run dev:web` | Start only the web application |
| `bun run dev:server` | Start only the server |
| `bun run check-types` | TypeScript type checking |
| `bun run db:push` | Push schema to database |
| `bun run db:studio` | Open Drizzle Studio UI |
| `bun run db:generate` | Generate migrations |
| `bun run db:migrate` | Run migrations |
| `bun run check` | Run Biome linting and formatting |
| `bun run deploy` | Deploy to Cloudflare |
| `bun run destroy` | Destroy deployment |

### Code Quality

```bash
# Format and lint fix
bun run check
```

The project uses [Biome](https://biomejs.dev/) for fast, unified linting and formatting.

### Testing

```bash
# Run tests
bun test

# Run tests with coverage
bun test --coverage
```

Domain entity tests are located in:
- `packages/api/src/domain/entities/calculation-root.test.ts`
- `packages/api/src/domain/value-objects/operator.test.ts`

## API Client (Frontend)

The web app uses oRPC client with TanStack Query integration:

```typescript
// apps/web/src/utils/orpc.ts
import { createORPCClient } from "@orpc/client";

const client = createORPCClient({
  baseURL: import.meta.env.VITE_SERVER_URL + "/rpc",
});

// Usage with React Query
const { data: trees } = useQuery({
  queryKey: ["calculation", "fullTree"],
  queryFn: () => client.calculation.getFullTree(),
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `bun run check` and `bun run check-types`
5. Submit a pull request

## License

This project is private and not licensed for public use.
