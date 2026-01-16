import { createFileRoute } from "@tanstack/react-router";

import { CalculationTree } from "@/components/calculation";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const { data: session } = authClient.useSession();
	const isAuthenticated = !!session?.user;

	return (
		<div className="container mx-auto max-w-3xl px-4 py-6">
			<header className="mb-8">
				<h1 className="font-bold text-3xl">Number Discussions</h1>
				<p className="mt-2 text-muted-foreground">
					Start with a number, apply operations, and build calculation trees
					together.
				</p>
			</header>

			<CalculationTree isAuthenticated={isAuthenticated} />
		</div>
	);
}
