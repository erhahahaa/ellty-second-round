import alchemy from "alchemy";
import { TanStackStart, Worker } from "alchemy/cloudflare";
import { GitHubComment } from "alchemy/github";
import { CloudflareStateStore } from "alchemy/state";
import { config } from "dotenv";

const isProd = process.argv.includes("prod");

config({ path: "./.env" });
if (isProd) {
	config({ path: "../../apps/web/.env.prod" });
	config({ path: "../../apps/server/.env.prod" });
} else {
	config({ path: "../../apps/web/.env" });
	config({ path: "../../apps/server/.env" });
}

const app = await alchemy("ellty-second-round", {
	stateStore: (scope) => new CloudflareStateStore(scope),
});

export const web = await TanStackStart("web", {
	cwd: "../../apps/web",
	bindings: {
		VITE_SERVER_URL: alchemy.env.VITE_SERVER_URL ?? "",
	},
});

export const server = await Worker("server", {
	cwd: "../../apps/server",
	entrypoint: "src/index.ts",
	compatibility: "node",
	bindings: {
		NODE_ENV: alchemy.env.NODE_ENV ?? "development",
		DATABASE_URL: alchemy.secret.env.DATABASE_URL ?? "",
		CORS_ORIGIN: alchemy.env.CORS_ORIGIN ?? "",
		BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET ?? "",
		BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL ?? "",
	},
	dev: {
		port: 3000,
	},
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

if (process.env.PULL_REQUEST) {
	// if this is a PR, add a comment to the PR with the preview URL
	// it will auto-update with each push
	await GitHubComment("preview-comment", {
		owner: "erhahahaa",
		repository: "ellty-second-round",
		issueNumber: Number(process.env.PULL_REQUEST),
		body: `## 🚀 Preview Deployed

Your changes have been deployed to a preview environment:

**🌐 Website:** ${web.url}

Built from commit ${process.env.GITHUB_SHA?.slice(0, 7)}

+---
<sub>🤖 This comment updates automatically with each push.</sub>`,
	});
}

await app.finalize();
