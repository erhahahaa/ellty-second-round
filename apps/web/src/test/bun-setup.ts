/**
 * Bun Test Setup
 *
 * This file sets up the DOM environment for Bun's native test runner.
 */
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Register happy-dom globally for DOM APIs
GlobalRegistrator.register();
