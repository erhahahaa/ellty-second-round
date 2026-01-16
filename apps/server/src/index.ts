import { createContext } from "@ellty-second-round/api/context";
import { appRouter } from "@ellty-second-round/api/routers/index";
import { createAuth } from "@ellty-second-round/auth";
import { getDb } from "@ellty-second-round/db";
import { env } from "@ellty-second-round/env/server";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

interface HonoContext {
	Bindings: Record<string, unknown>;
	Variables: {
		db: ReturnType<typeof getDb>;
	};
}

const app = new Hono<HonoContext>();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

// Auth routes - handle their own DB connection lifecycle
app.on(["POST", "GET"], "/api/auth/*", async (c) => {
	const { db, close } = getDb();
	try {
		const auth = createAuth(db);
		return auth.handler(c.req.raw);
	} finally {
		// await close();
	}
});

export const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});

export const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});

// RPC routes
app.use("/rpc/*", async (c) => {
	const dbConnection = getDb();
	const context = await createContext({ context: c, db: dbConnection });

	try {
		const rpcResult = await rpcHandler.handle(c.req.raw, {
			prefix: "/rpc",
			context: context,
		});

		if (rpcResult.matched) {
			return c.newResponse(rpcResult.response.body, rpcResult.response);
		}

		return c.notFound();
	} finally {
		// await context.dispose();
	}
});

// API Reference routes
app.use("/api-reference/*", async (c) => {
	const dbConnection = getDb();
	const context = await createContext({ context: c, db: dbConnection });

	try {
		const apiResult = await apiHandler.handle(c.req.raw, {
			prefix: "/api-reference",
			context: context,
		});

		if (apiResult.matched) {
			return c.newResponse(apiResult.response.body, apiResult.response);
		}

		return c.notFound();
	} finally {
		// await context.dispose();
	}
});

app.get("/", (c) => {
	return c.text("OK");
});

// Bun runtime: start server
const port = env.PORT || 3000;
console.log(`Server starting on http://localhost:${port}`);

export default {
	port,
	fetch: app.fetch,
};
