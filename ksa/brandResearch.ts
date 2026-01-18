/**
 * Brand Research KSA - Knowledge, Skills, and Abilities
 *
 * Agent-driven brand analysis and product extraction.
 * Uses browser navigation + visual analysis instead of regex patterns.
 *
 * Data Flow:
 * 1. Explore site with browser KSA
 * 2. Store discoveries in LOCAL Convex (sandbox)
 * 3. Query and verify locally
 * 4. Sync verified data to CLOUD Convex
 *
 * @example
 * // Analyze a brand's website
 * const profile = await analyzeSite("modgents.com");
 * console.log(profile.siteType); // "ecommerce"
 *
 * // Check local discovery stats
 * const stats = await getResearchStats("modgents.com");
 * console.log(`Found ${stats.products.total} products`);
 *
 * // Sync verified products to cloud
 * const synced = await syncToCloud("modgents.com", "brand_123");
 */

import { callGateway } from "./_shared/gateway";
import * as browser from "./browser";
import { scrape } from "./web";
import { api } from "../convex/_generated/api";
import { ConvexClient } from "convex/browser";

// ============================================================================
// ScrapeDo Fallback - For JS-rendered pages that Valyu can't handle
// ============================================================================

interface ScrapeDoResult {
  url: string;
  markdown: string;
  html?: string;
  title?: string;
}

/**
 * Scrape a URL using ScrapeDo via gateway.
 * Use this for sites that need JS rendering or when Valyu fails.
 *
 * @param url - URL to scrape
 * @param options - Scraping options
 * @returns Scraped content
 *
 * @example
 * // Scrape a JS-heavy SPA
 * const content = await scrapeWithScrapeDo("https://example.com");
 * console.log(content.markdown);
 *
 * // Scrape with residential proxy for anti-bot sites
 * const content = await scrapeWithScrapeDo("https://example.com", {
 *   useResidentialProxy: true,
 *   scrollCount: 5
 * });
 */
export async function scrapeWithScrapeDo(
  url: string,
  options?: {
    render?: boolean;
    scrollCount?: number;
    useResidentialProxy?: boolean;
  }
): Promise<ScrapeDoResult> {
  const response = await callGateway("services.ScrapeDo.internal.scrapeSPA", {
    url,
    scrollCount: options?.scrollCount ?? 3,
    clickLoadMore: true,
    extractNextData: true,
    super: options?.useResidentialProxy ?? false,
  });

  if (!response.success) {
    throw new Error(`ScrapeDo failed: ${response.error}`);
  }

  return {
    url,
    markdown: response.markdown || "",
    html: response.html,
    title: response.title,
  };
}

/**
 * Scrape with automatic fallback: tries Valyu first, then ScrapeDo.
 * This handles both simple sites (Valyu) and JS-heavy sites (ScrapeDo).
 *
 * @param url - URL to scrape
 * @returns Scraped content
 */
async function scrapeWithFallback(url: string): Promise<ScrapeDoResult> {
  // Try Valyu first (faster, simpler)
  try {
    const content = await scrape(url);
    if (content.markdown && content.markdown.length > 500) {
      return {
        url,
        markdown: content.markdown,
        title: content.title,
      };
    }
    console.log(`[BrandResearch] Valyu returned thin content, trying ScrapeDo...`);
  } catch (e) {
    console.log(`[BrandResearch] Valyu failed, trying ScrapeDo...`);
  }

  // Fallback to ScrapeDo (handles JS rendering)
  const scrapedoResult = await scrapeWithScrapeDo(url);

  // If still thin, try with residential proxy
  if (!scrapedoResult.markdown || scrapedoResult.markdown.length < 500) {
    console.log(`[BrandResearch] Content thin, retrying with residential proxy...`);
    return await scrapeWithScrapeDo(url, { useResidentialProxy: true, scrollCount: 5 });
  }

  return scrapedoResult;
}

// ============================================================================
// Types
// ============================================================================

export interface SiteProfile {
  domain: string;
  siteType: "ecommerce" | "saas" | "service" | "restaurant" | "media" | "other";
  platform?: "shopify" | "woocommerce" | "magento" | "custom" | "headless";
  confidence: number;
  navigation: NavigationHint[];
  productLocations: string[];
  observations: string[];
}

export interface NavigationHint {
  label: string;
  selector?: string;
  url?: string;
  purpose: "products" | "collections" | "pricing" | "menu" | "platform" | "features" | "integrations" | "services" | "other";
}

// ============================================================================
// SaaS URL Discovery Patterns
// For discovering platform, pricing, features, integrations, and services pages
// ============================================================================

/**
 * SaaS-specific URL patterns for multi-page extraction
 */
const SAAS_URL_PATTERNS = [
  // Platform/Overview
  { pattern: /\/platform\/?$/i, type: 'platform', priority: 1 },
  { pattern: /\/product\/?$/i, type: 'products', priority: 1 },
  { pattern: /\/products?\/?$/i, type: 'products', priority: 1 },
  { pattern: /\/overview\/?$/i, type: 'platform', priority: 2 },

  // Pricing
  { pattern: /\/pricing\/?$/i, type: 'pricing', priority: 1 },
  { pattern: /\/plans\/?$/i, type: 'pricing', priority: 2 },
  { pattern: /\/editions\/?$/i, type: 'pricing', priority: 2 },
  { pattern: /\/packages\/?$/i, type: 'pricing', priority: 3 },

  // Features
  { pattern: /\/features?\/?$/i, type: 'features', priority: 1 },
  { pattern: /\/capabilities\/?$/i, type: 'features', priority: 2 },
  { pattern: /\/solutions?\/?$/i, type: 'features', priority: 3 },
  { pattern: /\/what-we-do\/?$/i, type: 'features', priority: 3 },

  // Integrations
  { pattern: /\/integrations?\/?$/i, type: 'integrations', priority: 1 },
  { pattern: /\/marketplace\/?$/i, type: 'integrations', priority: 1 },
  { pattern: /\/exchange\/?$/i, type: 'integrations', priority: 2 },
  { pattern: /\/apps?\/?$/i, type: 'integrations', priority: 2 },
  { pattern: /\/partners?\/?$/i, type: 'integrations', priority: 3 },

  // Services
  { pattern: /\/services?\/?$/i, type: 'services', priority: 1 },
  { pattern: /\/professional-services?\/?$/i, type: 'services', priority: 1 },
  { pattern: /\/implementation\/?$/i, type: 'services', priority: 2 },
  { pattern: /\/support\/?$/i, type: 'services', priority: 3 },
  { pattern: /\/training\/?$/i, type: 'services', priority: 2 },

  // Legal/Product Descriptions (often has comprehensive product info)
  { pattern: /\/legal\/product-descriptions?\/?$/i, type: 'legal', priority: 1 },

  // API/Developer
  { pattern: /\/developer\/?$/i, type: 'developer', priority: 2 },
  { pattern: /\/api\/?$/i, type: 'developer', priority: 2 },
  { pattern: /\/docs?\/?$/i, type: 'developer', priority: 3 },
];

/**
 * Classify a URL based on SaaS patterns.
 *
 * @param url - URL to classify
 * @returns Classification with type and priority, or null if not SaaS-related
 *
 * @example
 * const classification = classifySaaSUrl("https://example.com/pricing");
 * console.log(classification); // { type: 'pricing', priority: 1 }
 */
export function classifySaaSUrl(url: string): { type: string; priority: number } | null {
  try {
    const pathname = new URL(url).pathname;
    for (const { pattern, type, priority } of SAAS_URL_PATTERNS) {
      if (pattern.test(pathname)) {
        return { type, priority };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Discover SaaS-relevant URLs from a domain.
 * Useful for multi-page extraction of platform, pricing, features, integrations.
 *
 * @param domain - Domain to explore
 * @param existingUrls - URLs already discovered (for deduplication)
 * @returns Array of classified URLs sorted by priority
 *
 * @example
 * const urls = await discoverSaaSUrls("seismic.com");
 * console.log(urls);
 * // [
 * //   { url: 'https://seismic.com/platform', type: 'platform', priority: 1 },
 * //   { url: 'https://seismic.com/pricing', type: 'pricing', priority: 1 },
 * //   { url: 'https://seismic.com/integrations', type: 'integrations', priority: 1 },
 * // ]
 */
export async function discoverSaaSUrls(
  domain: string,
  existingUrls: string[] = []
): Promise<Array<{ url: string; type: string; priority: number }>> {
  const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;
  const cleanDomain = new URL(baseUrl).hostname.replace("www.", "");

  console.log(`[BrandResearch] Discovering SaaS URLs for ${cleanDomain}...`);

  const classifiedUrls: Array<{ url: string; type: string; priority: number }> = [];
  const seenTypes = new Set<string>();
  const existingUrlsSet = new Set(existingUrls.map(u => u.toLowerCase()));

  // Classify existing URLs first
  for (const url of existingUrls) {
    const classification = classifySaaSUrl(url);
    if (classification && !seenTypes.has(classification.type)) {
      classifiedUrls.push({ url, ...classification });
      seenTypes.add(classification.type);
    }
  }

  // Try common SaaS paths that might not be linked
  const commonPaths = [
    { path: '/pricing', type: 'pricing', priority: 1 },
    { path: '/features', type: 'features', priority: 1 },
    { path: '/integrations', type: 'integrations', priority: 1 },
    { path: '/platform', type: 'platform', priority: 1 },
    { path: '/solutions', type: 'features', priority: 2 },
    { path: '/services', type: 'services', priority: 1 },
    { path: '/marketplace', type: 'integrations', priority: 1 },
    { path: '/apps', type: 'integrations', priority: 2 },
    { path: '/legal/product-descriptions', type: 'legal', priority: 1 },
  ];

  for (const { path, type, priority } of commonPaths) {
    if (seenTypes.has(type)) continue;

    const fullUrl = `${baseUrl.replace(/\/$/, '')}${path}`;
    if (existingUrlsSet.has(fullUrl.toLowerCase())) continue;

    // Check if the URL exists by trying to scrape it
    try {
      const content = await scrapeWithScrapeDo(fullUrl, { scrollCount: 1 });
      if (content.markdown && content.markdown.length > 500) {
        classifiedUrls.push({ url: fullUrl, type, priority });
        seenTypes.add(type);
        console.log(`[BrandResearch] Found SaaS page: ${path}`);
      }
    } catch {
      // URL doesn't exist or failed to load
    }
  }

  // Sort by priority
  classifiedUrls.sort((a, b) => a.priority - b.priority);

  console.log(`[BrandResearch] Discovered ${classifiedUrls.length} SaaS-relevant URLs:`,
    classifiedUrls.map(u => u.type).join(', '));

  return classifiedUrls;
}

export interface SaaSExtractionResult {
  platformInfo?: {
    platformName?: string;
    pillars?: string[];
    isUnifiedPlatform?: boolean;
  };
  products: Array<{
    name: string;
    type: string;
    description?: string;
    primaryFunction?: string;
    keyFeatures?: string[];
  }>;
  editions: Array<{
    name: string;
    displayName?: string;
    price?: number;
    billingPeriod?: string;
    priceType?: string;
    isPopular?: boolean;
    keyFeatures?: string[];
  }>;
  features: Array<{
    name: string;
    description?: string;
    category?: string;
    status: string;
    includedIn?: string[];
  }>;
  integrations: Array<{
    name: string;
    category?: string;
    type?: string;
    description?: string;
  }>;
  services: Array<{
    type: string;
    name: string;
    description?: string;
    pricing?: string;
    duration?: string;
  }>;
  aiCapabilities: Array<{
    name: string;
    type?: string;
    description?: string;
    status?: string;
  }>;
}

/**
 * Extract rich SaaS data from a page using LLM.
 *
 * @param content - Page content (markdown)
 * @param url - Page URL
 * @param pageType - Type of page (platform, pricing, features, etc.)
 * @returns Extracted SaaS data
 *
 * @example
 * const content = await scrapeWithScrapeDo("https://example.com/pricing");
 * const data = await extractSaaSData(content.markdown, content.url, "pricing");
 * console.log(data.editions); // Pricing tiers
 */
export async function extractSaaSData(
  content: string,
  url: string,
  pageType: string
): Promise<Partial<SaaSExtractionResult>> {
  const domain = new URL(url).hostname.replace("www.", "");

  const prompt = getSaaSExtractionPrompt(pageType, domain);

  const response = await callGateway("services.OpenRouter.internal.chatCompletion", {
    model: "google/gemini-2.0-flash-001",
    messages: [{
      role: "user",
      content: `${prompt}\n\nPage content:\n${content.slice(0, 20000)}`,
    }],
    responseFormat: { type: "json_object" },
  });

  try {
    return JSON.parse(response.choices?.[0]?.message?.content || "{}");
  } catch {
    return {};
  }
}

function getSaaSExtractionPrompt(pageType: string, domain: string): string {
  const basePrompt = `You are extracting detailed product/service data from a SaaS company website.
Site: ${domain}
Page Type: ${pageType}

CRITICAL RULES:
1. ONLY extract content that is ACTUALLY PRESENT in the provided content
2. DO NOT make up, invent, or hallucinate any content
3. If information is not found, use null or empty arrays
4. Be precise with product names - use exact names from the page`;

  const pagePrompts: Record<string, string> = {
    platform: `${basePrompt}

## Extract Platform Architecture
Look for:
- Platform name (e.g., "Seismic Enablement Cloud")
- Main pillars or components
- Whether it's a unified platform
- Core value proposition

Return JSON:
{
  "platformInfo": {
    "platformName": "string or null",
    "pillars": ["array of pillar names"],
    "isUnifiedPlatform": true/false
  },
  "products": [{
    "name": "...",
    "type": "platform" | "module" | "add-on",
    "description": "...",
    "primaryFunction": "..."
  }]
}`,

    pricing: `${basePrompt}

## Extract Pricing/Editions Information
Look for pricing tiers/plans and feature comparison matrix.

Return JSON:
{
  "editions": [{
    "name": "Professional",
    "displayName": "Professional Plan",
    "price": 99,
    "billingPeriod": "monthly" | "annually",
    "priceType": "per_user" | "flat" | "custom",
    "isPopular": true/false,
    "keyFeatures": ["feature 1", "feature 2"]
  }],
  "features": [{
    "name": "Single Sign-On",
    "description": "...",
    "status": "ga" | "beta" | "coming_soon",
    "includedIn": ["Professional", "Enterprise"]
  }]
}`,

    features: `${basePrompt}

## Extract Features/Capabilities
Look for product features and AI capabilities.

Return JSON:
{
  "features": [{
    "name": "...",
    "description": "...",
    "category": "Security" | "AI" | "Analytics" | "Collaboration" | "Other",
    "status": "ga" | "beta" | "coming_soon"
  }],
  "aiCapabilities": [{
    "name": "...",
    "type": "agent" | "assistant" | "feature",
    "description": "...",
    "status": "ga" | "beta" | "coming_q4_2025"
  }]
}`,

    integrations: `${basePrompt}

## Extract Integrations/Marketplace
Look for native integrations, marketplace apps, and API integrations.

Return JSON:
{
  "integrations": [{
    "name": "Salesforce",
    "category": "CRM" | "Marketing" | "Collaboration" | "Communication" | "Productivity" | "Analytics" | "Security" | "Storage" | "Other",
    "type": "native" | "marketplace" | "api" | "partner",
    "description": "..."
  }]
}`,

    services: `${basePrompt}

## Extract Professional Services
Look for implementation, training, consulting, and support services.

Return JSON:
{
  "services": [{
    "type": "implementation" | "training" | "consulting" | "support" | "managed_service",
    "name": "...",
    "description": "...",
    "pricing": "Custom" | "$X/hour" | etc.,
    "duration": "4 weeks" | "Ongoing" | etc.
  }]
}`,
  };

  return pagePrompts[pageType] || pagePrompts.features;
}

/**
 * Run full SaaS deep extraction on a domain.
 * Discovers relevant pages and extracts rich product data.
 *
 * @param domain - Domain to analyze
 * @param options - Extraction options
 * @returns Aggregated SaaS extraction result
 *
 * @example
 * const result = await runSaaSDeepExtraction("seismic.com");
 * console.log(`Found ${result.products.length} products`);
 * console.log(`Found ${result.integrations.length} integrations`);
 */
export async function runSaaSDeepExtraction(
  domain: string,
  options?: {
    maxPages?: number;
    includeTypes?: string[];
  }
): Promise<SaaSExtractionResult> {
  const maxPages = options?.maxPages || 10;
  const includeTypes = options?.includeTypes || ['platform', 'pricing', 'features', 'integrations', 'services'];

  console.log(`[BrandResearch] Starting SaaS deep extraction for ${domain}...`);

  // Step 1: Discover SaaS-relevant URLs
  const saasUrls = await discoverSaaSUrls(domain);
  const urlsToProcess = saasUrls
    .filter(u => includeTypes.includes(u.type))
    .slice(0, maxPages);

  console.log(`[BrandResearch] Processing ${urlsToProcess.length} SaaS pages...`);

  // Step 2: Extract data from each page
  const results: Partial<SaaSExtractionResult>[] = [];

  for (const { url, type } of urlsToProcess) {
    try {
      console.log(`[BrandResearch] Extracting ${type}: ${url}`);
      const content = await scrapeWithScrapeDo(url, { scrollCount: 3 });
      const extracted = await extractSaaSData(content.markdown, url, type);
      results.push(extracted);
    } catch (e: any) {
      console.log(`[BrandResearch] Failed to process ${url}: ${e.message}`);
    }
  }

  // Step 3: Merge results
  const merged: SaaSExtractionResult = {
    platformInfo: undefined,
    products: [],
    editions: [],
    features: [],
    integrations: [],
    services: [],
    aiCapabilities: [],
  };

  for (const result of results) {
    if (result.platformInfo && !merged.platformInfo) {
      merged.platformInfo = result.platformInfo;
    }
    if (result.products) merged.products.push(...result.products);
    if (result.editions) merged.editions.push(...result.editions);
    if (result.features) merged.features.push(...result.features);
    if (result.integrations) merged.integrations.push(...result.integrations);
    if (result.services) merged.services.push(...result.services);
    if (result.aiCapabilities) merged.aiCapabilities.push(...result.aiCapabilities);
  }

  // Step 4: Deduplicate by name
  const dedupeByName = <T extends { name: string }>(arr: T[]): T[] => {
    const seen = new Set<string>();
    return arr.filter(item => {
      const key = item.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  merged.products = dedupeByName(merged.products);
  merged.editions = dedupeByName(merged.editions);
  merged.features = dedupeByName(merged.features);
  merged.integrations = dedupeByName(merged.integrations);
  merged.services = dedupeByName(merged.services);
  merged.aiCapabilities = dedupeByName(merged.aiCapabilities);

  console.log(`[BrandResearch] SaaS extraction complete:`);
  console.log(`  Platform: ${merged.platformInfo?.platformName || 'Not found'}`);
  console.log(`  Products: ${merged.products.length}`);
  console.log(`  Editions: ${merged.editions.length}`);
  console.log(`  Features: ${merged.features.length}`);
  console.log(`  Integrations: ${merged.integrations.length}`);
  console.log(`  Services: ${merged.services.length}`);
  console.log(`  AI Capabilities: ${merged.aiCapabilities.length}`);

  return merged;
}

export interface Product {
  name: string;
  type: "physical" | "saas" | "service";
  price?: number;
  currency?: string;
  description?: string;
  images: string[];
  sourceUrl: string;
  variants?: ProductVariant[];
  category?: string;
}

export interface ProductVariant {
  name: string;
  price?: number;
  sku?: string;
  available?: boolean;
}

export interface ResearchStats {
  domain: string;
  site: {
    siteType: string;
    platform?: string;
    confidence: number;
    analyzedAt: number;
    navigationHints: number;
  } | null;
  urls: {
    total: number;
    product: number;
    listing: number;
    scraped: number;
  };
  products: {
    total: number;
    verified: number;
    synced: number;
    withImages: number;
  };
}

// ============================================================================
// Local Convex Client (Sandbox)
// ============================================================================

// Connect to local Convex running in sandbox
const LOCAL_CONVEX_URL = process.env.CONVEX_URL || "http://127.0.0.1:3210";
let localClient: ConvexClient | null = null;

function getLocalClient(): ConvexClient {
  if (!localClient) {
    localClient = new ConvexClient(LOCAL_CONVEX_URL);
  }
  return localClient;
}

// ============================================================================
// Site Analysis
// ============================================================================

/**
 * Analyze a website to understand its structure and find product locations.
 * Uses visual analysis of screenshots + LLM to understand the site.
 * Stores result in LOCAL Convex for querying.
 *
 * @param domain - Domain to analyze (e.g., "modgents.com")
 * @returns Site profile with navigation hints
 *
 * @example
 * const profile = await analyzeSite("modgents.com");
 * console.log(profile.siteType); // "ecommerce"
 * console.log(profile.navigation); // [{ label: "Shop", purpose: "products" }]
 */
export async function analyzeSite(domain: string): Promise<SiteProfile> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  const cleanDomain = new URL(url).hostname.replace("www.", "");

  console.log(`[BrandResearch] Analyzing ${cleanDomain}...`);

  // Open the site and take a screenshot
  const openResult = await browser.open(url);
  if (!openResult.success) {
    throw new Error(`Failed to open ${url}: ${openResult.error}`);
  }

  // Take screenshot for visual analysis
  const screenshot = await browser.screenshot("homepage");

  // Get the HTML and text content
  const html = await browser.getHtml();
  const text = await browser.getText();

  // Use LLM to analyze the site (with vision)
  const analysis = await callGateway("services.OpenRouter.internal.chatCompletion", {
    model: "google/gemini-2.0-flash-001",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this website homepage and create a site profile.

Domain: ${cleanDomain}

Text content (first 5000 chars):
${text.slice(0, 5000)}

---

Create a JSON site profile:

{
  "siteType": "ecommerce" | "saas" | "service" | "restaurant" | "media" | "other",
  "platform": "shopify" | "woocommerce" | "magento" | "custom" | "headless" | null,
  "confidence": 0.0-1.0,
  "navigation": [
    {
      "label": "visible text on navigation element",
      "selector": "CSS selector if identifiable",
      "url": "href if visible",
      "purpose": "products" | "collections" | "pricing" | "menu" | "other"
    }
  ],
  "productLocations": ["descriptions of where products might be found"],
  "observations": ["key observations about the site"]
}

Focus on finding:
1. Where products/services/offerings are located
2. Navigation elements that lead to product pages
3. The type of business and platform used`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${screenshot.base64}`,
            },
          },
        ],
      },
    ],
    responseFormat: { type: "json_object" },
  });

  const llmProfile = JSON.parse(analysis.choices?.[0]?.message?.content || "{}");

  const profile: SiteProfile = {
    domain: cleanDomain,
    siteType: llmProfile.siteType || "other",
    platform: llmProfile.platform,
    confidence: llmProfile.confidence || 0.5,
    navigation: llmProfile.navigation || [],
    productLocations: llmProfile.productLocations || [],
    observations: llmProfile.observations || [],
  };

  // Store in local Convex
  const client = getLocalClient();
  await client.mutation(api.brandResearch.storeSiteAnalysis, {
    domain: cleanDomain,
    siteType: profile.siteType,
    platform: profile.platform,
    confidence: profile.confidence,
    navigation: profile.navigation.map(n => ({
      label: n.label,
      selector: n.selector,
      url: n.url,
      purpose: n.purpose,
    })),
    observations: profile.observations,
    productLocations: profile.productLocations,
    screenshotPath: screenshot.path,
  });

  await browser.closeBrowser();

  console.log(`[BrandResearch] Analysis complete: ${profile.siteType} (${profile.platform || "custom"})`);
  console.log(`[BrandResearch] Found ${profile.navigation.length} navigation hints`);

  return profile;
}

// ============================================================================
// URL Discovery
// ============================================================================

/**
 * Discover product URLs on a website by exploring navigation.
 * Uses browser to navigate and find product pages.
 *
 * @param domain - Domain to explore
 * @param profile - Site profile (optional, will analyze if not provided)
 * @returns Number of URLs discovered
 *
 * @example
 * const count = await discoverUrls("modgents.com");
 * console.log(`Discovered ${count} URLs`);
 */
export async function discoverUrls(
  domain: string,
  profile?: SiteProfile
): Promise<number> {
  const siteProfile = profile || await analyzeSite(domain);
  const cleanDomain = siteProfile.domain;
  const baseUrl = `https://${cleanDomain}`;

  console.log(`[BrandResearch] Discovering URLs on ${cleanDomain}...`);

  const discoveredUrls: Array<{ url: string; urlType: string; confidence: number }> = [];

  // Open the homepage
  await browser.open(baseUrl);

  // Strategy 1: Follow navigation hints
  for (const nav of siteProfile.navigation) {
    if (nav.purpose === "products" || nav.purpose === "collections" || nav.purpose === "pricing") {
      try {
        let targetUrl: string;

        if (nav.url) {
          targetUrl = nav.url.startsWith("http")
            ? nav.url
            : new URL(nav.url, baseUrl).href;
        } else if (nav.selector) {
          // Click and get the resulting URL
          await browser.click(nav.selector);
          await new Promise(r => setTimeout(r, 2000));
          // Get current URL from page
          const text = await browser.getText();
          // For now, use nav label as hint
          targetUrl = `${baseUrl}/${nav.label.toLowerCase().replace(/\s+/g, "-")}`;
        } else {
          continue;
        }

        discoveredUrls.push({
          url: targetUrl,
          urlType: nav.purpose === "pricing" ? "pricing" : "listing",
          confidence: 0.8,
        });

        // Navigate and extract links from the page
        await browser.open(targetUrl);
        const html = await browser.getHtml();
        const pageUrls = await extractUrlsFromPage(html, baseUrl, cleanDomain, siteProfile.siteType);
        discoveredUrls.push(...pageUrls);

        console.log(`[BrandResearch] ${nav.label} → ${pageUrls.length} URLs`);
      } catch (e) {
        console.log(`[BrandResearch] Failed to explore ${nav.label}`);
      }
    }
  }

  // Strategy 2: Try common paths
  const commonPaths = ["/products", "/shop", "/collections", "/menu", "/pricing", "/plans"];
  for (const path of commonPaths) {
    try {
      const targetUrl = `${baseUrl}${path}`;
      if (discoveredUrls.some(u => u.url === targetUrl)) continue;

      await browser.open(targetUrl);
      const html = await browser.getHtml();

      if (html.length > 1000) {
        discoveredUrls.push({
          url: targetUrl,
          urlType: "listing",
          confidence: 0.7,
        });

        const pageUrls = await extractUrlsFromPage(html, baseUrl, cleanDomain, siteProfile.siteType);
        discoveredUrls.push(...pageUrls);

        console.log(`[BrandResearch] ${path} → ${pageUrls.length} URLs`);
      }
    } catch {
      // Path doesn't exist
    }
  }

  await browser.closeBrowser();

  // Store in local Convex
  const client = getLocalClient();
  await client.mutation(api.brandResearch.storeDiscoveredUrls, {
    domain: cleanDomain,
    urls: discoveredUrls.map(u => ({
      url: u.url,
      urlType: u.urlType as any,
      confidence: u.confidence,
    })),
  });

  console.log(`[BrandResearch] Discovered ${discoveredUrls.length} URLs total`);

  return discoveredUrls.length;
}

/**
 * Extract URLs from a page using LLM (no regex!)
 */
async function extractUrlsFromPage(
  html: string,
  baseUrl: string,
  domain: string,
  siteType: string
): Promise<Array<{ url: string; urlType: string; confidence: number }>> {
  // Use LLM to classify links from HTML
  const extraction = await callGateway("services.OpenRouter.internal.chatCompletion", {
    model: "google/gemini-2.0-flash-001",
    messages: [
      {
        role: "user",
        content: `Extract product/listing URLs from this HTML.

Site type: ${siteType}
Domain: ${domain}

HTML (first 15000 chars):
${html.slice(0, 15000)}

Find all <a href="..."> links that point to:
1. Individual product pages
2. Category/collection pages
3. Pricing pages

Return JSON array:
[
  { "url": "full URL", "urlType": "product" | "listing" | "pricing", "confidence": 0.0-1.0 }
]

IMPORTANT:
- Only include URLs from the same domain (${domain})
- Convert relative URLs to absolute using ${baseUrl}
- Skip navigation, footer, social, blog, about, contact links
- Focus on commerce/product related URLs`,
      },
    ],
    responseFormat: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(extraction.choices?.[0]?.message?.content || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ============================================================================
// Product Extraction
// ============================================================================

/**
 * Scrape and extract products from discovered URLs.
 * Uses local Convex to track progress.
 *
 * @param domain - Domain to scrape
 * @param maxPages - Maximum pages to scrape (default: 20)
 * @returns Number of products extracted
 *
 * @example
 * const count = await scrapeProducts("modgents.com", 50);
 * console.log(`Extracted ${count} products`);
 */
export async function scrapeProducts(
  domain: string,
  maxPages: number = 20
): Promise<number> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const client = getLocalClient();

  // Get URLs to scrape from local Convex
  const urlsToScrape = await client.query(api.brandResearch.getUrlsToScrape, {
    domain: cleanDomain,
    limit: maxPages,
  });

  console.log(`[BrandResearch] Scraping ${urlsToScrape.length} URLs...`);

  let totalProducts = 0;

  for (const urlRecord of urlsToScrape) {
    try {
      // Scrape the page with automatic fallback (Valyu → ScrapeDo)
      const content = await scrapeWithFallback(urlRecord.url);

      // Extract products using LLM
      const products = await extractProductsFromContent(
        content.markdown,
        urlRecord.url,
        urlRecord.urlType
      );

      // Store products in local Convex
      if (products.length > 0) {
        await client.mutation(api.brandResearch.storeProducts, {
          domain: cleanDomain,
          sourceUrl: urlRecord.url,
          products: products.map(p => ({
            name: p.name,
            type: p.type,
            price: p.price,
            currency: p.currency,
            description: p.description,
            images: p.images,
            category: p.category,
            variants: p.variants,
          })),
        });

        totalProducts += products.length;
        console.log(`[BrandResearch] ${urlRecord.url} → ${products.length} products`);
      }

      // Mark URL as scraped
      await client.mutation(api.brandResearch.markUrlScraped, {
        urlId: urlRecord._id,
        productCount: products.length,
      });
    } catch (e: any) {
      // Mark URL as failed
      await client.mutation(api.brandResearch.markUrlScraped, {
        urlId: urlRecord._id,
        error: e.message,
      });
      console.log(`[BrandResearch] Failed: ${urlRecord.url} - ${e.message}`);
    }
  }

  console.log(`[BrandResearch] Extracted ${totalProducts} products total`);

  return totalProducts;
}

/**
 * Extract products from page content using LLM
 */
async function extractProductsFromContent(
  content: string,
  sourceUrl: string,
  pageType: string
): Promise<Product[]> {
  const extraction = await callGateway("services.OpenRouter.internal.chatCompletion", {
    model: "google/gemini-2.0-flash-001",
    messages: [
      {
        role: "user",
        content: `Extract all products from this ${pageType} page.

URL: ${sourceUrl}

Page content:
${content.slice(0, 20000)}

Return JSON array of products:
[
  {
    "name": "Product name",
    "type": "physical" | "saas" | "service",
    "price": 99.99 (number or null),
    "currency": "USD",
    "description": "Brief description",
    "images": ["image URL 1", "image URL 2"],
    "category": "product category",
    "variants": [
      { "name": "Variant name", "price": 99.99, "sku": "SKU123" }
    ]
  }
]

IMPORTANT:
- Only extract REAL products, not navigation items or banners
- Include ALL products visible on this page
- For SaaS, extract pricing plans as products (type: "saas")
- For restaurants, extract menu items as products (type: "physical")
- Extract ALL images associated with each product
- Skip testimonials, team members, blog posts`,
      },
    ],
    responseFormat: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(extraction.choices?.[0]?.message?.content || "[]");
    const products = Array.isArray(parsed) ? parsed : [];

    return products.map(p => ({
      name: p.name,
      type: p.type || "physical",
      price: typeof p.price === "number" ? p.price : undefined,
      currency: p.currency,
      description: p.description,
      images: Array.isArray(p.images) ? p.images : [],
      sourceUrl,
      category: p.category,
      variants: p.variants,
    }));
  } catch {
    return [];
  }
}

// ============================================================================
// Stats & Querying
// ============================================================================

/**
 * Get research stats for a domain from local Convex.
 *
 * @param domain - Domain to get stats for
 * @returns Research statistics
 *
 * @example
 * const stats = await getResearchStats("modgents.com");
 * console.log(`Found ${stats.products.total} products`);
 * console.log(`${stats.products.verified} verified`);
 */
export async function getResearchStats(domain: string): Promise<ResearchStats> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const client = getLocalClient();

  return await client.query(api.brandResearch.getResearchSummary, {
    domain: cleanDomain,
  });
}

/**
 * Get all discovered products for a domain.
 *
 * @param domain - Domain to get products for
 * @param verifiedOnly - Only return verified products
 * @returns Array of products
 */
export async function getProducts(
  domain: string,
  verifiedOnly: boolean = false
): Promise<Product[]> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const client = getLocalClient();

  const products = await client.query(api.brandResearch.getProducts, {
    domain: cleanDomain,
    verifiedOnly,
  });

  return products.map((p: any) => ({
    name: p.name,
    type: p.type,
    price: p.price,
    currency: p.currency,
    description: p.description,
    images: p.images,
    sourceUrl: p.sourceUrl,
    category: p.category,
    variants: p.variants,
  }));
}

// ============================================================================
// Monitoring & Progress
// ============================================================================

export interface ResearchProgress {
  domain: string;
  phase: "idle" | "analyzing" | "discovering" | "scraping" | "verifying" | "syncing" | "complete" | "error";
  startedAt?: number;
  completedAt?: number;
  stats: ResearchStats;
  currentUrl?: string;
  errors: string[];
  elapsedMs?: number;
}

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  summary: string;
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  field: string;
  message: string;
  productName?: string;
}

// Track active research sessions
const activeResearch = new Map<string, {
  phase: ResearchProgress["phase"];
  startedAt: number;
  currentUrl?: string;
  errors: string[];
}>();

/**
 * Start tracking a research session.
 */
function startResearchTracking(domain: string): void {
  activeResearch.set(domain, {
    phase: "analyzing",
    startedAt: Date.now(),
    errors: [],
  });
}

/**
 * Update research phase.
 */
function updateResearchPhase(
  domain: string,
  phase: ResearchProgress["phase"],
  currentUrl?: string
): void {
  const session = activeResearch.get(domain);
  if (session) {
    session.phase = phase;
    session.currentUrl = currentUrl;
  }
}

/**
 * Record an error in research.
 */
function recordResearchError(domain: string, error: string): void {
  const session = activeResearch.get(domain);
  if (session) {
    session.errors.push(error);
  }
}

/**
 * Get current progress of a research session.
 *
 * @param domain - Domain being researched
 * @returns Current progress including phase, stats, and errors
 *
 * @example
 * const progress = await monitorProgress("modgents.com");
 * console.log(`Phase: ${progress.phase}`);
 * console.log(`Products found: ${progress.stats.products.total}`);
 */
export async function monitorProgress(domain: string): Promise<ResearchProgress> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const session = activeResearch.get(cleanDomain);
  const stats = await getResearchStats(cleanDomain);

  return {
    domain: cleanDomain,
    phase: session?.phase || "idle",
    startedAt: session?.startedAt,
    completedAt: session?.phase === "complete" ? Date.now() : undefined,
    stats,
    currentUrl: session?.currentUrl,
    errors: session?.errors || [],
    elapsedMs: session?.startedAt ? Date.now() - session.startedAt : undefined,
  };
}

/**
 * Wait for a research phase to complete.
 *
 * @param domain - Domain being researched
 * @param targetPhase - Phase to wait for (or "complete")
 * @param timeoutMs - Maximum time to wait (default: 5 minutes)
 * @returns Final progress when target phase reached
 *
 * @example
 * // Wait for scraping to complete
 * const progress = await awaitPhase("modgents.com", "verifying", 120000);
 */
export async function awaitPhase(
  domain: string,
  targetPhase: ResearchProgress["phase"],
  timeoutMs: number = 300000
): Promise<ResearchProgress> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const startTime = Date.now();

  const phaseOrder = ["idle", "analyzing", "discovering", "scraping", "verifying", "syncing", "complete"];
  const targetIndex = phaseOrder.indexOf(targetPhase);

  while (Date.now() - startTime < timeoutMs) {
    const progress = await monitorProgress(cleanDomain);
    const currentIndex = phaseOrder.indexOf(progress.phase);

    // Check if we've reached or passed the target phase
    if (currentIndex >= targetIndex || progress.phase === "error") {
      return progress;
    }

    // Wait before checking again
    await new Promise(r => setTimeout(r, 2000));
  }

  // Timeout reached
  const finalProgress = await monitorProgress(cleanDomain);
  finalProgress.errors.push(`Timeout waiting for phase: ${targetPhase}`);
  return finalProgress;
}

/**
 * Wait for research to fully complete.
 *
 * @param domain - Domain being researched
 * @param timeoutMs - Maximum time to wait (default: 10 minutes)
 * @returns Final progress when complete
 *
 * @example
 * const result = await awaitCompletion("modgents.com");
 * if (result.phase === "complete") {
 *   console.log(`Found ${result.stats.products.total} products!`);
 * }
 */
export async function awaitCompletion(
  domain: string,
  timeoutMs: number = 600000
): Promise<ResearchProgress> {
  return awaitPhase(domain, "complete", timeoutMs);
}

/**
 * Validate research results meet quality standards.
 *
 * @param domain - Domain to validate
 * @param options - Validation options
 * @returns Validation result with score and issues
 *
 * @example
 * const validation = await validateResults("modgents.com", { minProducts: 10 });
 * if (validation.valid) {
 *   console.log(`Validation passed with score ${validation.score}`);
 * } else {
 *   console.log("Issues:", validation.issues);
 * }
 */
export async function validateResults(
  domain: string,
  options?: {
    minProducts?: number;
    minWithImages?: number;
    minWithPrice?: number;
    minVerified?: number;
  }
): Promise<ValidationResult> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const stats = await getResearchStats(cleanDomain);
  const products = await getProducts(cleanDomain);

  const minProducts = options?.minProducts || 5;
  const minWithImages = options?.minWithImages || 3;
  const minWithPrice = options?.minWithPrice || 0;
  const minVerified = options?.minVerified || 0;

  const issues: ValidationIssue[] = [];
  let score = 100;

  // Check minimum products
  if (stats.products.total < minProducts) {
    issues.push({
      severity: "error",
      field: "products.total",
      message: `Found ${stats.products.total} products, need at least ${minProducts}`,
    });
    score -= 30;
  }

  // Check products with images
  if (stats.products.withImages < minWithImages) {
    issues.push({
      severity: "warning",
      field: "products.withImages",
      message: `Only ${stats.products.withImages} products have images, need at least ${minWithImages}`,
    });
    score -= 15;
  }

  // Check products with prices
  const productsWithPrice = products.filter(p => p.price !== undefined).length;
  if (productsWithPrice < minWithPrice) {
    issues.push({
      severity: "warning",
      field: "products.withPrice",
      message: `Only ${productsWithPrice} products have prices, need at least ${minWithPrice}`,
    });
    score -= 10;
  }

  // Check verified products
  if (stats.products.verified < minVerified) {
    issues.push({
      severity: "warning",
      field: "products.verified",
      message: `Only ${stats.products.verified} products verified, need at least ${minVerified}`,
    });
    score -= 10;
  }

  // Check for duplicate products (by name)
  const names = products.map(p => p.name.toLowerCase().trim());
  const uniqueNames = new Set(names);
  if (uniqueNames.size < names.length) {
    const duplicates = names.length - uniqueNames.size;
    issues.push({
      severity: "warning",
      field: "products.duplicates",
      message: `Found ${duplicates} duplicate product names`,
    });
    score -= 5 * Math.min(duplicates, 5);
  }

  // Check for products without names (junk)
  const junkProducts = products.filter(p => !p.name || p.name.length < 3);
  if (junkProducts.length > 0) {
    issues.push({
      severity: "error",
      field: "products.junk",
      message: `Found ${junkProducts.length} products with invalid names`,
    });
    score -= 10 * Math.min(junkProducts.length, 3);
  }

  // Check for navigation junk (common nav words in product names)
  const navWords = ["menu", "home", "about", "contact", "login", "cart", "shop", "all"];
  const navJunk = products.filter(p =>
    navWords.some(word => p.name.toLowerCase() === word)
  );
  if (navJunk.length > 0) {
    issues.push({
      severity: "error",
      field: "products.navJunk",
      message: `Found ${navJunk.length} navigation items extracted as products: ${navJunk.map(p => p.name).join(", ")}`,
    });
    score -= 20;
  }

  score = Math.max(0, score);
  const valid = score >= 60 && !issues.some(i => i.severity === "error");

  return {
    valid,
    score,
    issues,
    summary: valid
      ? `Validation passed with score ${score}/100. Found ${stats.products.total} products.`
      : `Validation failed with score ${score}/100. ${issues.filter(i => i.severity === "error").length} errors found.`,
  };
}

/**
 * Check if research is currently active for a domain.
 */
export function isResearchActive(domain: string): boolean {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const session = activeResearch.get(cleanDomain);
  return session !== undefined && session.phase !== "complete" && session.phase !== "error";
}

/**
 * Cancel an active research session.
 */
export function cancelResearch(domain: string): boolean {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (activeResearch.has(cleanDomain)) {
    activeResearch.delete(cleanDomain);
    return true;
  }
  return false;
}

// ============================================================================
// Verification
// ============================================================================

/**
 * Verify discovered products with visual inspection.
 * Uses browser to view product pages and confirm data.
 *
 * @param domain - Domain to verify products for
 * @param sampleSize - Number of products to verify (default: 10)
 * @returns Number of products verified
 */
export async function verifyProducts(
  domain: string,
  sampleSize: number = 10
): Promise<number> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const client = getLocalClient();

  // Get unverified products
  const products = await client.query(api.brandResearch.getProducts, {
    domain: cleanDomain,
    verifiedOnly: false,
    limit: sampleSize,
  });

  console.log(`[BrandResearch] Verifying ${products.length} products...`);

  let verified = 0;

  for (const product of products) {
    try {
      // Open product page
      await browser.open(product.sourceUrl);
      const screenshot = await browser.screenshot(`verify-${product._id}`);
      const text = await browser.getText();

      // Ask LLM to verify
      const verification = await callGateway("services.OpenRouter.internal.chatCompletion", {
        model: "google/gemini-2.0-flash-001",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Verify this product extraction is correct.

Extracted product:
- Name: ${product.name}
- Type: ${product.type}
- Price: ${product.price} ${product.currency}
- Description: ${product.description}
- Images: ${product.images.length}

Page text:
${text.slice(0, 3000)}

Is this extraction accurate? Return JSON:
{
  "verified": true | false,
  "issues": ["list any issues found"],
  "corrections": { "field": "corrected value" }
}`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${screenshot.base64}`,
                },
              },
            ],
          },
        ],
        responseFormat: { type: "json_object" },
      });

      const result = JSON.parse(verification.choices?.[0]?.message?.content || "{}");

      await client.mutation(api.brandResearch.verifyProduct, {
        productId: product._id,
        verified: result.verified === true,
        notes: result.issues?.join("; "),
      });

      if (result.verified) {
        verified++;
        console.log(`[BrandResearch] ✓ ${product.name}`);
      } else {
        console.log(`[BrandResearch] ✗ ${product.name}: ${result.issues?.join(", ")}`);
      }
    } catch (e: any) {
      console.log(`[BrandResearch] Failed to verify ${product.name}: ${e.message}`);
    }
  }

  await browser.closeBrowser();

  console.log(`[BrandResearch] Verified ${verified}/${products.length} products`);

  return verified;
}

// ============================================================================
// Cloud Sync
// ============================================================================

/**
 * Sync verified products to cloud Convex (main database).
 *
 * @param domain - Domain to sync products for
 * @param brandId - Brand ID in cloud database
 * @returns Number of products synced
 *
 * @example
 * const synced = await syncToCloud("modgents.com", "brand_123");
 * console.log(`Synced ${synced} products to cloud`);
 */
export async function syncToCloud(
  domain: string,
  brandId: string
): Promise<number> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const client = getLocalClient();

  // Get unsynced verified products
  const products = await client.query(api.brandResearch.getUnsyncedProducts, {
    domain: cleanDomain,
    verifiedOnly: true,
  });

  console.log(`[BrandResearch] Syncing ${products.length} products to cloud...`);

  let synced = 0;

  for (const product of products) {
    try {
      // Call cloud Convex via gateway
      const cloudResult = await callGateway(
        "features.brands.intelligence.entityInsert.insertProduct",
        {
          brandId,
          name: product.name,
          type: product.type,
          price: product.price,
          currency: product.currency,
          description: product.description,
          images: product.images,
          sourceUrl: product.sourceUrl,
          category: product.category,
          variants: product.variants,
        }
      );

      // Mark as synced locally
      await client.mutation(api.brandResearch.markProductSynced, {
        productId: product._id,
        cloudProductId: (cloudResult as any).productId,
      });

      synced++;
    } catch (e: any) {
      console.log(`[BrandResearch] Failed to sync ${product.name}: ${e.message}`);
    }
  }

  console.log(`[BrandResearch] Synced ${synced} products to cloud`);

  return synced;
}

// ============================================================================
// Parallel Scraping
// ============================================================================

/**
 * Scrape multiple URLs in parallel with rate limiting.
 *
 * @param domain - Domain being scraped
 * @param maxConcurrent - Maximum concurrent scrapes (default: 3)
 * @param maxPages - Maximum total pages to scrape
 * @returns Number of products extracted
 *
 * @example
 * const count = await parallelScrape("modgents.com", 5, 50);
 * console.log(`Extracted ${count} products in parallel`);
 */
export async function parallelScrape(
  domain: string,
  maxConcurrent: number = 3,
  maxPages: number = 50
): Promise<number> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const client = getLocalClient();

  // Get all URLs to scrape
  const urlsToScrape = await client.query(api.brandResearch.getUrlsToScrape, {
    domain: cleanDomain,
    limit: maxPages,
  });

  if (urlsToScrape.length === 0) {
    console.log(`[BrandResearch] No URLs to scrape for ${cleanDomain}`);
    return 0;
  }

  console.log(`[BrandResearch] Parallel scraping ${urlsToScrape.length} URLs (concurrency: ${maxConcurrent})...`);

  let totalProducts = 0;
  let completed = 0;

  // Process in batches
  for (let i = 0; i < urlsToScrape.length; i += maxConcurrent) {
    const batch = urlsToScrape.slice(i, i + maxConcurrent);

    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (urlRecord) => {
        updateResearchPhase(cleanDomain, "scraping", urlRecord.url);

        try {
          const content = await scrape(urlRecord.url);
          const products = await extractProductsFromContent(
            content.markdown,
            urlRecord.url,
            urlRecord.urlType
          );

          if (products.length > 0) {
            await client.mutation(api.brandResearch.storeProducts, {
              domain: cleanDomain,
              sourceUrl: urlRecord.url,
              products: products.map(p => ({
                name: p.name,
                type: p.type,
                price: p.price,
                currency: p.currency,
                description: p.description,
                images: p.images,
                category: p.category,
                variants: p.variants,
              })),
            });
          }

          await client.mutation(api.brandResearch.markUrlScraped, {
            urlId: urlRecord._id,
            productCount: products.length,
          });

          return products.length;
        } catch (e: any) {
          recordResearchError(cleanDomain, `Failed to scrape ${urlRecord.url}: ${e.message}`);
          await client.mutation(api.brandResearch.markUrlScraped, {
            urlId: urlRecord._id,
            error: e.message,
          });
          return 0;
        }
      })
    );

    // Count successes
    for (const result of results) {
      if (result.status === "fulfilled") {
        totalProducts += result.value;
      }
      completed++;
    }

    console.log(`[BrandResearch] Progress: ${completed}/${urlsToScrape.length} URLs, ${totalProducts} products`);

    // Small delay between batches to avoid rate limiting
    if (i + maxConcurrent < urlsToScrape.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`[BrandResearch] Parallel scrape complete: ${totalProducts} products from ${completed} URLs`);

  return totalProducts;
}

// ============================================================================
// Full Research Flow
// ============================================================================

export interface FullResearchResult {
  profile: SiteProfile;
  urlsDiscovered: number;
  productsFound: number;
  productsVerified: number;
  productsSynced: number;
  validation: ValidationResult;
  elapsedMs: number;
}

/**
 * Run a full brand research: analyze → discover → scrape → verify → sync.
 * Tracks progress and validates results.
 *
 * @param domain - Domain to research
 * @param brandId - Brand ID to sync to
 * @param options - Research options
 * @returns Research results with validation
 *
 * @example
 * const result = await fullResearch("modgents.com", "brand_123", {
 *   maxProducts: 50,
 *   autoVerify: true,
 *   autoSync: true,
 *   parallel: true,
 * });
 * console.log(`Found ${result.productsFound}, synced ${result.productsSynced}`);
 * console.log(`Validation: ${result.validation.summary}`);
 */
export async function fullResearch(
  domain: string,
  brandId: string,
  options?: {
    maxProducts?: number;
    autoVerify?: boolean;
    autoSync?: boolean;
    parallel?: boolean;
    concurrency?: number;
    minProducts?: number;
  }
): Promise<FullResearchResult> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const maxProducts = options?.maxProducts || 50;
  const autoVerify = options?.autoVerify !== false;
  const autoSync = options?.autoSync !== false;
  const parallel = options?.parallel !== false;
  const concurrency = options?.concurrency || 3;
  const minProducts = options?.minProducts || 5;

  const startTime = Date.now();

  console.log(`[BrandResearch] Starting full research for ${domain}...`);

  // Start tracking
  startResearchTracking(cleanDomain);

  try {
    // Step 1: Analyze site
    updateResearchPhase(cleanDomain, "analyzing");
    const profile = await analyzeSite(domain);

    // Step 2: Discover URLs
    updateResearchPhase(cleanDomain, "discovering");
    const urlsDiscovered = await discoverUrls(domain, profile);

    // Step 3: Scrape products (parallel or sequential)
    updateResearchPhase(cleanDomain, "scraping");
    let productsFound: number;
    if (parallel) {
      productsFound = await parallelScrape(domain, concurrency, maxProducts);
    } else {
      productsFound = await scrapeProducts(domain, maxProducts);
    }

    // Step 4: Verify products (optional)
    let productsVerified = 0;
    if (autoVerify && productsFound > 0) {
      updateResearchPhase(cleanDomain, "verifying");
      productsVerified = await verifyProducts(domain, Math.min(10, productsFound));
    }

    // Step 5: Sync to cloud (optional)
    let productsSynced = 0;
    if (autoSync && productsVerified > 0) {
      updateResearchPhase(cleanDomain, "syncing");
      productsSynced = await syncToCloud(domain, brandId);
    }

    // Step 6: Validate results
    const validation = await validateResults(domain, { minProducts });

    // Mark complete
    updateResearchPhase(cleanDomain, "complete");

    const elapsedMs = Date.now() - startTime;

    console.log(`[BrandResearch] Research complete in ${(elapsedMs / 1000).toFixed(1)}s!`);
    console.log(`  - Site type: ${profile.siteType}`);
    console.log(`  - URLs discovered: ${urlsDiscovered}`);
    console.log(`  - Products found: ${productsFound}`);
    console.log(`  - Products verified: ${productsVerified}`);
    console.log(`  - Products synced: ${productsSynced}`);
    console.log(`  - Validation: ${validation.summary}`);

    return {
      profile,
      urlsDiscovered,
      productsFound,
      productsVerified,
      productsSynced,
      validation,
      elapsedMs,
    };
  } catch (e: any) {
    updateResearchPhase(cleanDomain, "error");
    recordResearchError(cleanDomain, e.message);
    throw e;
  }
}

// ============================================================================
// Social Discovery (Intelligent Gap Detection)
// ============================================================================

export interface BrandDataStatus {
  brandId: string;
  domain: string;
  name: string;
  hasSocials: {
    theCompanies: boolean;
    whatCMS: boolean;
    brandDev: boolean;
  };
  verifiedSocials: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
    linkedin?: string;
  };
  entityCounts: {
    products: number;
    assets: number;
    ads: number;
    socialPosts: number;  // Owned content (not Reddit)
    mentions: number;     // Reddit mentions
  };
  gaps: string[];  // What's missing
}

export interface SocialDiscoveryResult {
  youtube: { channel: any; videos: number; shorts: number };
  instagram: { profile: any; posts: number };
  tiktok: { profile: any; videos: number };
  twitter: { profile: any; tweets: number };
  facebook: { profile: any; posts: number };
  linkedin: { company: any; posts: number };
  reddit: { posts: number; comments: number };
  errors: string[];
}

/**
 * Get brand data status including what's available and what's missing.
 * Queries cloud Convex to check products, social URLs, and social posts.
 *
 * @param brandId - Brand ID in cloud database
 * @returns Brand data status with gaps identified
 *
 * @example
 * const status = await getBrandDataStatus("brand_123");
 * console.log(`Gaps: ${status.gaps.join(", ")}`);
 * if (status.gaps.includes("socialPosts")) {
 *   await discoverSocialContent("brand_123", status.verifiedSocials);
 * }
 */
export async function getBrandDataStatus(brandId: string): Promise<BrandDataStatus> {
  // Query brand data from cloud
  const brandData = await callGateway("features.brands.core.crud.get", {
    id: brandId,
  });

  if (!brandData) {
    throw new Error(`Brand not found: ${brandId}`);
  }

  const brand = brandData as any;

  // Extract social URLs from all sources
  const companySocials = brand.companyDetails?.socials || {};
  const styleguideArray = brand.styleguide?.socials || [];
  const whatCMSSocials = brand.companyDetails?.whatCMS?.socialProfiles || [];

  // Build styleguide map (Brand.dev format: [{ type: "twitter", url: "..." }])
  const styleguideMap: Record<string, string> = {};
  for (const s of styleguideArray) {
    if (s.type && s.url) {
      const key = s.type === 'x' ? 'twitter' : s.type;
      styleguideMap[key] = s.url;
    }
  }

  // Build WhatCMS map
  const whatCMSMap: Record<string, string> = {};
  for (const s of whatCMSSocials) {
    if (s.network && s.url) {
      whatCMSMap[s.network] = s.url;
    }
  }

  // Merge: TheCompanies > WhatCMS > Brand.dev
  const verifiedSocials: BrandDataStatus["verifiedSocials"] = {
    twitter: companySocials.twitter?.url || whatCMSMap.twitter || styleguideMap.twitter,
    instagram: companySocials.instagram?.url || whatCMSMap.instagram || styleguideMap.instagram,
    facebook: companySocials.facebook?.url || whatCMSMap.facebook || styleguideMap.facebook,
    youtube: companySocials.youtube?.url || whatCMSMap.youtube || styleguideMap.youtube,
    tiktok: companySocials.tiktok?.url || whatCMSMap.tiktok || styleguideMap.tiktok,
    linkedin: companySocials.linkedin?.url || whatCMSMap.linkedin || styleguideMap.linkedin,
  };

  // Get entity counts
  const entityCounts = await callGateway("features.brands.core.products.getBrandEntityCounts", {
    brandId,
  }) as BrandDataStatus["entityCounts"];

  // Identify gaps
  const gaps: string[] = [];

  if (entityCounts.products === 0) {
    gaps.push("products");
  }

  // Check if we have social URLs but no social posts
  const hasVerifiedSocials = Object.values(verifiedSocials).some(url => !!url);
  if (hasVerifiedSocials && entityCounts.socialPosts === 0) {
    gaps.push("socialPosts");
  }

  // Check for missing company details
  if (!brand.companyDetails?.name) {
    gaps.push("companyDetails");
  }

  return {
    brandId,
    domain: brand.domain,
    name: brand.name,
    hasSocials: {
      theCompanies: Object.values(companySocials).some((s: any) => s?.url),
      whatCMS: whatCMSSocials.length > 0,
      brandDev: styleguideArray.length > 0,
    },
    verifiedSocials,
    entityCounts,
    gaps,
  };
}

/**
 * Discover and store social content for a brand.
 * Triggers the cloud social discovery action with verified URLs.
 *
 * @param brandId - Brand ID in cloud database
 * @param verifiedSocials - Verified social URLs to use
 * @returns Discovery results
 *
 * @example
 * const status = await getBrandDataStatus("brand_123");
 * if (status.gaps.includes("socialPosts")) {
 *   const result = await discoverSocialContent("brand_123", status.verifiedSocials);
 *   console.log(`Found ${result.instagram.posts} Instagram posts`);
 * }
 */
export async function discoverSocialContent(
  brandId: string,
  verifiedSocials: BrandDataStatus["verifiedSocials"]
): Promise<SocialDiscoveryResult> {
  // Get brand info for the action
  const brandData = await callGateway("features.brands.core.crud.get", {
    id: brandId,
  });

  if (!brandData) {
    throw new Error(`Brand not found: ${brandId}`);
  }

  const brand = brandData as any;

  console.log(`[BrandResearch] Discovering social content for ${brand.name}...`);
  console.log(`  Verified URLs: ${Object.entries(verifiedSocials).filter(([_, v]) => v).map(([k]) => k).join(", ") || "none"}`);

  // Call the cloud social discovery action
  const result = await callGateway("features.brands.ads.adApis.discoverOrganicSocial", {
    brandId,
    brandName: brand.name,
    domain: brand.domain,
    maxPostsPerPlatform: 10,
    verifiedSocials,
  }) as SocialDiscoveryResult;

  // Log results
  const totalPosts =
    (result.instagram?.posts || 0) +
    (result.twitter?.tweets || 0) +
    (result.facebook?.posts || 0) +
    (result.youtube?.videos || 0) + (result.youtube?.shorts || 0) +
    (result.tiktok?.videos || 0) +
    (result.linkedin?.posts || 0);

  console.log(`[BrandResearch] Social discovery complete:`);
  console.log(`  Instagram: ${result.instagram?.posts || 0} posts`);
  console.log(`  Twitter: ${result.twitter?.tweets || 0} tweets`);
  console.log(`  Facebook: ${result.facebook?.posts || 0} posts`);
  console.log(`  YouTube: ${(result.youtube?.videos || 0) + (result.youtube?.shorts || 0)} videos`);
  console.log(`  TikTok: ${result.tiktok?.videos || 0} videos`);
  console.log(`  LinkedIn: ${result.linkedin?.posts || 0} posts`);
  console.log(`  Reddit: ${result.reddit?.posts || 0} mentions`);
  console.log(`  Total: ${totalPosts} owned posts`);

  if (result.errors?.length > 0) {
    console.log(`  Errors: ${result.errors.join(", ")}`);
  }

  return result;
}

/**
 * Check brand data and fill any gaps automatically.
 * This is the main intelligent function that:
 * 1. Checks what data exists
 * 2. Identifies gaps
 * 3. Fills gaps by running appropriate actions
 *
 * @param brandId - Brand ID in cloud database
 * @param options - Options for gap filling
 * @returns Status and results of gap filling
 *
 * @example
 * // Run full gap analysis and filling
 * const result = await checkAndFillGaps("brand_123");
 * console.log(`Filled gaps: ${result.filledGaps.join(", ")}`);
 *
 * // Only fill social gaps
 * const result = await checkAndFillGaps("brand_123", { onlyGaps: ["socialPosts"] });
 */
export async function checkAndFillGaps(
  brandId: string,
  options?: {
    onlyGaps?: string[];
    skipGaps?: string[];
  }
): Promise<{
  status: BrandDataStatus;
  filledGaps: string[];
  socialResult?: SocialDiscoveryResult;
  errors: string[];
}> {
  const errors: string[] = [];
  const filledGaps: string[] = [];
  let socialResult: SocialDiscoveryResult | undefined;

  // Get current status
  const status = await getBrandDataStatus(brandId);

  console.log(`[BrandResearch] Checking gaps for ${status.name} (${status.domain}):`);
  console.log(`  Products: ${status.entityCounts.products}`);
  console.log(`  Social posts: ${status.entityCounts.socialPosts}`);
  console.log(`  Mentions: ${status.entityCounts.mentions}`);
  console.log(`  Gaps: ${status.gaps.join(", ") || "none"}`);

  // Filter gaps based on options
  let gapsToFill = status.gaps;
  if (options?.onlyGaps) {
    gapsToFill = gapsToFill.filter(g => options.onlyGaps!.includes(g));
  }
  if (options?.skipGaps) {
    gapsToFill = gapsToFill.filter(g => !options.skipGaps!.includes(g));
  }

  // Fill social posts gap
  if (gapsToFill.includes("socialPosts")) {
    try {
      socialResult = await discoverSocialContent(brandId, status.verifiedSocials);
      const totalPosts =
        (socialResult.instagram?.posts || 0) +
        (socialResult.twitter?.tweets || 0) +
        (socialResult.facebook?.posts || 0) +
        (socialResult.youtube?.videos || 0) + (socialResult.youtube?.shorts || 0) +
        (socialResult.tiktok?.videos || 0) +
        (socialResult.linkedin?.posts || 0);

      if (totalPosts > 0) {
        filledGaps.push("socialPosts");
      }

      if (socialResult.errors?.length > 0) {
        errors.push(...socialResult.errors);
      }
    } catch (e: any) {
      errors.push(`Social discovery failed: ${e.message}`);
    }
  }

  // Note: Product gap filling would be handled by fullResearch()
  // This function focuses on supplementary data like social posts

  console.log(`[BrandResearch] Gap filling complete:`);
  console.log(`  Filled: ${filledGaps.join(", ") || "none"}`);
  if (errors.length > 0) {
    console.log(`  Errors: ${errors.join("; ")}`);
  }

  return {
    status,
    filledGaps,
    socialResult,
    errors,
  };
}

/**
 * Get WhatCMS social profiles for a domain.
 * Uses WhatCMS API to find social media accounts linked to a website.
 *
 * @param domain - Domain to check
 * @returns Social profiles found by WhatCMS
 *
 * @example
 * const profiles = await getWhatCMSSocials("example.com");
 * console.log(profiles); // [{ network: "twitter", url: "...", profile: "..." }]
 */
export async function getWhatCMSSocials(domain: string): Promise<Array<{
  network: string;
  url: string;
  profile: string;
}>> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;

  const result = await callGateway("services.WhatCMS.internal.detectTechnology", {
    url,
    private: true,
  }) as any;

  return result?.meta?.social || [];
}
