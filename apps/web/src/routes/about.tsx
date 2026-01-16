import { createFileRoute } from "@tanstack/react-router";
import { Github, Mail, User } from "lucide-react";

export const Route = createFileRoute("/about")({
	component: AboutPage,
});

function AboutPage() {
	return (
		<div className="container mx-auto max-w-3xl px-4 py-6">
			<header className="mb-8">
				<h1 className="font-bold text-3xl">About</h1>
				<p className="mt-2 text-muted-foreground">
					Applicant details for the Ellty second round assessment.
				</p>
			</header>

			<div className="space-y-6">
				<div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
					<h2 className="mb-4 font-semibold text-xl">Applicant Details</h2>

					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<User className="h-5 w-5 text-muted-foreground" />
							<div>
								<p className="font-medium text-muted-foreground text-sm">
									Name
								</p>
								<p className="text-foreground">Rahmat Hidayatullah</p>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<Mail className="h-5 w-5 text-muted-foreground" />
							<div>
								<p className="font-medium text-muted-foreground text-sm">
									Email
								</p>
								<a
									href="mailto:rahmat.zenta@gmail.com"
									className="text-foreground hover:underline"
								>
									rahmat.zenta@gmail.com
								</a>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<Github className="h-5 w-5 text-muted-foreground" />
							<div>
								<p className="font-medium text-muted-foreground text-sm">
									GitHub Profile
								</p>
								<a
									href="https://github.com/erhahahaa"
									target="_blank"
									rel="noopener noreferrer"
									className="text-foreground hover:underline"
								>
									github.com/erhahahaa
								</a>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<Github className="h-5 w-5 text-muted-foreground" />
							<div>
								<p className="font-medium text-muted-foreground text-sm">
									Project Repository
								</p>
								<a
									href="https://github.com/erhahahaa/ellty-second-round"
									target="_blank"
									rel="noopener noreferrer"
									className="text-foreground hover:underline"
								>
									github.com/erhahahaa/ellty-second-round
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
