import { defineConfig } from "vite";

// A relative build also works inside an offline release folder served over HTTP.
export default defineConfig({ base: "./" });
