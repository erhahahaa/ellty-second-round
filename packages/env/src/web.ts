import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

interface MetaEnv {
	env: Record<string, string | boolean | number | undefined>;
}

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_SERVER_URL: z.url(),
	},
	runtimeEnv: (import.meta as unknown as MetaEnv).env,
	emptyStringAsUndefined: true,
});
