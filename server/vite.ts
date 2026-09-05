import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import { seoSlug, SITE_URL } from "@shared/seo";
import { SERVICE_SEO_CONTENT, resolveServiceSlug } from "@shared/service-content";
import { SERVICE_AREA_BY_SLUG } from "@shared/service-area-content";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true as const,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, { index: false }));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (req, res, next) => {
    try {
      const escapeHtml = (value: string) => value.replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" }[character] || character));
      const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
      const absoluteMedia = (value?: string | null) => value ? (value.startsWith("http") ? value : `${SITE_URL}${value.startsWith("/") ? "" : "/"}${value}`) : undefined;
      // Express rewrites req.path to "/" inside an app.use("*") handler.
      // originalUrl preserves the customer-facing path needed for per-page SEO.
      const pathname = new URL(req.originalUrl, SITE_URL).pathname.replace(/\/+$/, "") || "/";
      const privateRoute = /^\/(admin|customer-portal|portal|leave-review|review-thank-you|quote-thank-you|reschedule|quote|invoice)(\/|$)/.test(pathname);
      let status = 200;
      let title = "HandyTech Solutions | Handyman Services in St. Louis, MO";
      let description = "Professional handyman, repair, installation, painting, carpentry, plumbing fixture, and smart-home services in the St. Louis, Missouri area.";
      let canonical = `${SITE_URL}${pathname === "/" ? "/" : pathname}`;
      let robots = privateRoute ? "noindex, nofollow" : "index, follow";
      let image: string | undefined;
      let schema: unknown;

      if (pathname === "/") {
        schema = { "@context": "https://schema.org", "@type": "HomeAndConstructionBusiness", name: "HandyTech Solutions", url: SITE_URL, telephone: "+1-314-325-4575", email: "contact@handytech-solutions.com", areaServed: ["St. Louis, MO", "Hazelwood, MO", "Florissant, MO", "Ferguson, MO", "Bridgeton, MO"] };
      } else if (pathname === "/services") {
        title = "Handyman Services in St. Louis, MO | HandyTech Solutions";
        description = "Explore HandyTech Solutions services for repairs, installations, painting, carpentry, plumbing fixtures, electrical fixtures, and smart-home technology in St. Louis.";
      } else if (pathname.startsWith("/services/")) {
        const slug = pathname.split("/")[2];
        const resolvedSlug = resolveServiceSlug(slug);
        const service = (await storage.getAllServices()).find((item) => item.isActive && seoSlug(item.name) === resolvedSlug);
        if (service) {
          title = `${service.name} in St. Louis, MO | HandyTech Solutions`;
          description = SERVICE_SEO_CONTENT[resolvedSlug]?.metaDescription || (service.description || `Professional ${service.name.toLowerCase()} from HandyTech Solutions in the St. Louis area.`).slice(0, 160);
          schema = { "@context": "https://schema.org", "@graph": [{ "@type": "Service", name: service.name, description: service.description, provider: { "@type": "LocalBusiness", name: "HandyTech Solutions", telephone: "+1-314-325-4575", url: SITE_URL }, areaServed: ["St. Louis, MO", "Hazelwood, MO", "Florissant, MO", "Ferguson, MO", "Bridgeton, MO"], url: canonical }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/services` }, { "@type": "ListItem", position: 3, name: service.name, item: canonical }] }] };
        } else {
          status = 404; robots = "noindex, follow"; title = "Service Not Found | HandyTech Solutions"; description = "The requested HandyTech service page could not be found.";
        }
      } else if (pathname === "/gallery") {
        title = "Handyman Project Gallery | HandyTech Solutions St. Louis";
        description = "See completed HandyTech repair, renovation, installation, painting, carpentry, and smart-home projects in the St. Louis area.";
      } else if (pathname === "/service-areas") {
        title = "St. Louis Area Handyman Service Locations | HandyTech";
        description = "HandyTech Solutions serves St. Louis, Hazelwood, Florissant, Ferguson, and Bridgeton with professional handyman and smart-home services.";
      } else if (pathname.startsWith("/service-areas/")) {
        const slug = pathname.split("/")[2];
        const area = SERVICE_AREA_BY_SLUG[slug];
        if (area) {
          title = `${area.title} | HandyTech Solutions`;
          description = area.metaDescription;
          schema = { "@context": "https://schema.org", "@graph": [{ "@type": "HomeAndConstructionBusiness", name: "HandyTech Solutions", url: canonical, telephone: "+1-314-325-4575", email: "contact@handytech-solutions.com", areaServed: { "@type": "City", name: `${area.city}, Missouri` } }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Service Areas", item: `${SITE_URL}/service-areas` }, { "@type": "ListItem", position: 3, name: area.city, item: canonical }] }] };
        } else {
          status = 404; robots = "noindex, follow"; title = "Service Area Not Found | HandyTech Solutions"; description = "The requested HandyTech service-area page could not be found.";
        }
      } else if (pathname.startsWith("/projects/")) {
        const slug = pathname.split("/")[2];
        const project = (await storage.getAllProjectGalleryItems()).find((item) => seoSlug(item.title) === slug);
        if (project) {
          const location = project.location ? ` in ${project.location}` : " in the St. Louis area";
          title = `${project.title}${location} | HandyTech Solutions`;
          description = project.description.slice(0, 160);
          image = absoluteMedia(project.imageUrl);
          const projectImages = Array.from(new Set([project.imageUrl, project.beforeImageUrl, ...(project.imageUrls || []), ...(project.beforeImageUrls || [])].filter((value): value is string => Boolean(value)))).map((value) => absoluteMedia(value));
          const projectVideos = (project.videoUrls || []).map((value, index) => ({ "@type": "VideoObject", name: `${project.title} video ${index + 1}`, description: project.description, contentUrl: absoluteMedia(value), thumbnailUrl: projectImages[0], uploadDate: new Date(project.completionDate).toISOString() }));
          schema = { "@context": "https://schema.org", "@graph": [{ "@type": "CreativeWork", name: project.title, description: project.description, image: projectImages, video: projectVideos, dateCreated: new Date(project.completionDate).toISOString(), contentLocation: project.location ? { "@type": "Place", name: project.location } : undefined, creator: { "@type": "HomeAndConstructionBusiness", name: "HandyTech Solutions", telephone: "+1-314-325-4575", url: SITE_URL }, url: canonical }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Projects", item: `${SITE_URL}/gallery` }, { "@type": "ListItem", position: 3, name: project.title, item: canonical }] }] };
        } else {
          status = 404; robots = "noindex, follow"; title = "Project Not Found | HandyTech Solutions"; description = "The requested HandyTech project page could not be found.";
        }
      } else if (!["/", "/privacy-policy", "/terms"].includes(pathname) && !privateRoute) {
        status = 404; robots = "noindex, follow"; title = "Page Not Found | HandyTech Solutions"; description = "The requested page could not be found.";
      }

      const seoBlock = `<!--SEO_START--><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}" /><link rel="canonical" href="${escapeHtml(canonical)}" /><meta name="robots" content="${robots}" /><meta property="og:title" content="${escapeHtml(title)}" /><meta property="og:description" content="${escapeHtml(description)}" /><meta property="og:type" content="website" /><meta property="og:url" content="${escapeHtml(canonical)}" />${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ""}<meta name="twitter:card" content="summary_large_image" />${schema ? `<script type="application/ld+json">${safeJson(schema)}</script>` : ""}<!--SEO_END-->`;
      const template = await fs.promises.readFile(path.resolve(distPath, "index.html"), "utf8");
      const page = template.replace(/<!--SEO_START-->[\s\S]*?<!--SEO_END-->/, seoBlock);
      res.status(status).type("html").send(page);
    } catch (error) {
      next(error);
    }
  });
}
