import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    // Important for Electron builds (file://) so assets resolve correctly.
    // Also works for web deployment.
    base: "./",
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png", "pwa-512.png", "pwa-icon.svg"],
        manifest: {
          name: "School Planner",
          short_name: "Planner",
          description: "Планирование нагрузки, предметов и внеурочной деятельности",
          start_url: "/",
          scope: "/",
          display: "standalone",
          theme_color: "#0b0b0c",
          background_color: "#0b0b0c",
          icons: [
            { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
            { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            { src: "/pwa-icon.svg", sizes: "any", type: "image/svg+xml" },
          ],
        },
      }),
      ...(isDev ? [componentTagger()] : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

