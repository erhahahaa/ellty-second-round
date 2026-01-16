import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "PUBLIC_",
	client: {},
	server: {
		NODE_ENV: z.enum(["development", "production", "test"]),
		PORT: z.string().transform((v) => Number.parseInt(v, 10)),
		DATABASE_URL: z.url(),
		CORS_ORIGIN: z.url(),
		BETTER_AUTH_SECRET: z.string().min(16),
		BETTER_AUTH_URL: z.url(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
