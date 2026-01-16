import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Only load alchemy plugin when not in Docker (miniflare doesn't work in containers)
const isDocker = process.env.DOCKER === "true";

async function getAlchemyPlugin(): Promise<Plugin | null> {
	if (isDocker) {
		return null;
	}
	try {
		const alchemy = await import("alchemy/cloudflare/tanstack-start");
		return alchemy.default();
	} catch {
		return null;
	}
}

export default defineConfig(async () => {
	const alchemyPlugin = await getAlchemyPlugin();

	return {
		plugins: [
			tsconfigPaths(),
			tailwindcss(),
			tanstackStart(),
			viteReact(),
			// Conditionally add alchemy plugin (doesn't work in Docker due to miniflare)
			...(alchemyPlugin ? [alchemyPlugin] : []),
		],
		server: {
			port: 3001,
		},
	};
});
