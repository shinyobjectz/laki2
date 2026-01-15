# KSA Reference Documentation

> Auto-generated from KSA source files.
> Generated at: 2026-01-15T19:02:52.046Z


## System Operations

### browser

Browser Skills Functions for browser automation. Uses the agent-browser CLI for headless browser control.

```typescript
import { open, screenshot, click, type, getHtml, getText, closeBrowser } from './ksa/browser';
```

#### `open()`

Open a URL in the browser.

**Parameters:**

- `url`: `string` - URL to navigate to

**Returns:** `Promise<BrowserResult>`

**Example:**
```typescript
await open('https://example.com');
```



#### `screenshot()`

Take a screenshot of the current page.

**Parameters:**

- `name`: `any` (optional) - Optional filename (default: screenshot)

**Returns:** `Promise<Screenshot>`

**Example:**
```typescript
const { path } = await screenshot('homepage');
// Saves to /home/user/artifacts/homepage.png
```



#### `click()`

Click an element on the page.

**Parameters:**

- `selector`: `string` - CSS selector for element to click

**Returns:** `Promise<BrowserResult>`

**Example:**
```typescript
await click('button.submit');
```



#### `type()`

Type text into an input field.

**Parameters:**

- `selector`: `string` - CSS selector for input element

- `text`: `string` - Text to type

**Returns:** `Promise<BrowserResult>`

**Example:**
```typescript
await type('input[name="search"]', 'hello world');
```



#### `getHtml()`

Get the current page's HTML content.

**Returns:** `Promise<string>`

**Example:**
```typescript
const html = await getHtml();
```



#### `getText()`

Get the current page's text content.

**Returns:** `Promise<string>`

**Example:**
```typescript
const text = await getText();
```



#### `closeBrowser()`

Close the browser session.

**Returns:** `Promise<void>`

**Example:**
```typescript
await close();
```



### social

Social Media KSA - Knowledge, Skills, and Abilities Scrape and analyze social media profiles and content across platforms. Supports: TikTok, Instagram, YouTube, Twitter/X, LinkedIn, Facebook, Reddit, and more.

```typescript
import { tiktokProfile, instagramProfile, youtubeProfile, twitterProfile, linkedinProfile, tiktokPosts, instagramPosts, twitterPosts, searchSocial } from './ksa/social';
```

#### `tiktokProfile()`

Get a TikTok user profile.

**Parameters:**

- `username`: `string` - TikTok username (without @)

**Returns:** `Promise<SocialProfile>`

**Example:**
```typescript
const profile = await tiktokProfile('charlidamelio');
console.log(`${profile.displayName}: ${profile.followers} followers`);
```



#### `instagramProfile()`

Get an Instagram user profile.

**Parameters:**

- `username`: `string` - Instagram username

**Returns:** `Promise<SocialProfile>`

**Example:**
```typescript
const profile = await instagramProfile('instagram');
console.log(`${profile.displayName}: ${profile.followers} followers`);
```



#### `youtubeProfile()`

Get a YouTube channel profile.

**Parameters:**

- `channelId`: `string` - YouTube channel ID or handle

**Returns:** `Promise<SocialProfile>`

**Example:**
```typescript
const profile = await youtubeProfile('@MrBeast');
console.log(`${profile.displayName}: ${profile.followers} subscribers`);
```



#### `twitterProfile()`

Get a Twitter/X user profile.

**Parameters:**

- `username`: `string` - Twitter username (without @)

**Returns:** `Promise<SocialProfile>`

**Example:**
```typescript
const profile = await twitterProfile('elonmusk');
console.log(`${profile.displayName}: ${profile.followers} followers`);
```



#### `linkedinProfile()`

Get a LinkedIn user or company profile.

**Parameters:**

- `handle`: `string` - LinkedIn username or company URL slug

- `type`: `"person" | "company"` (optional) - 'person' or 'company'

**Returns:** `Promise<SocialProfile>`

**Example:**
```typescript
const profile = await linkedinProfile('microsoft', 'company');
console.log(`${profile.displayName}: ${profile.followers} followers`);
```



#### `tiktokPosts()`

Get recent posts from a TikTok user.

**Parameters:**

- `username`: `string` - TikTok username

- `limit`: `any` (optional) - Maximum posts to return (default: 10)

**Returns:** `Promise<SocialPost[]>`

**Example:**
```typescript
const posts = await tiktokPosts('charlidamelio', 5);
for (const post of posts) {
  console.log(`${post.views} views: ${post.text?.slice(0, 50)}`);
}
```



#### `instagramPosts()`

Get recent posts from an Instagram user.

**Parameters:**

- `username`: `string` - Instagram username

- `limit`: `any` (optional) - Maximum posts to return (default: 10)

**Returns:** `Promise<SocialPost[]>`

**Example:**
```typescript
const posts = await instagramPosts('instagram', 5);
for (const post of posts) {
  console.log(`${post.likes} likes: ${post.text?.slice(0, 50)}`);
}
```



#### `twitterPosts()`

Get recent tweets from a Twitter/X user.

**Parameters:**

- `username`: `string` - Twitter username

- `limit`: `any` (optional) - Maximum tweets to return (default: 10)

**Returns:** `Promise<SocialPost[]>`

**Example:**
```typescript
const tweets = await twitterPosts('elonmusk', 5);
for (const tweet of tweets) {
  console.log(`${tweet.likes} likes: ${tweet.text?.slice(0, 50)}`);
}
```



#### `searchSocial()`

Search for social media content across platforms.

**Parameters:**

- `query`: `string` - Search query

- `platform`: `"tiktok" | "instagram" | "twitter" | "youtube"` - Platform to search (tiktok, instagram, twitter, youtube)

- `limit`: `any` (optional) - Maximum results (default: 10)

**Returns:** `Promise<SocialSearchResult>`

**Example:**
```typescript
const results = await searchSocial('AI news', 'twitter', 10);
for (const post of results.posts) {
  console.log(`[${post.author}] ${post.text?.slice(0, 50)}`);
}
```



### beads

Beads KSA - Knowledge, Skills, and Abilities Task planning and tracking for agent workflows. Use beads to break down work into trackable tasks, track progress, and coordinate retries.

```typescript
import { create, update, close, list, getReady, get } from './ksa/beads';
```

#### `create()`

Create a new task for tracking work.

**Parameters:**

- `options`: `CreateOptions` - Task creation options

**Returns:** `Promise<CreateResult>`

**Example:**
```typescript
const task = await create({
  title: 'Research market trends',
  type: 'task',
  priority: 1,
});
console.log(`Created task: ${task.id}`);
```



#### `update()`

Update an existing task.

**Parameters:**

- `id`: `string` - Task ID

- `options`: `UpdateOptions` - Fields to update

**Returns:** `Promise<void>`

**Example:**
```typescript
await update('task-1', { status: 'in_progress' });
```



#### `close()`

Close a task as completed.

**Parameters:**

- `id`: `string` - Task ID

- `reason`: `string` (optional) - Optional completion reason

**Returns:** `Promise<void>`

**Example:**
```typescript
await close('task-1', 'Successfully generated report');
```



#### `list()`

List tasks with optional filters.

**Parameters:**

- `options`: `{
  status?: IssueStatus;
  type?: IssueType;
}` (optional) - Filter options

**Returns:** `Promise<Issue[]>`

**Example:**
```typescript
const openTasks = await list({ status: 'open' });
console.log(`${openTasks.length} tasks remaining`);
```



#### `getReady()`

Get tasks ready to work on (open and unblocked).

**Returns:** `Promise<Issue[]>`

**Example:**
```typescript
const ready = await getReady();
if (ready.length > 0) {
  console.log(`Next task: ${ready[0].title}`);
}
```



#### `get()`

Get a single task by ID.

**Parameters:**

- `id`: `string` - Task ID

**Returns:** `Promise<Issue | null>`

**Example:**
```typescript
const task = await get('task-1');
if (task) {
  console.log(`Task status: ${task.status}`);
}
```



### file

File Skills Functions for reading, writing, and searching files. These operate on the local filesystem in the sandbox.

```typescript
import { read, write, edit, glob, grep, ls } from './ksa/file';
```

#### `read()`

Read a file's contents.

**Parameters:**

- `filePath`: `string` - Path to the file

**Returns:** `Promise<string>`

**Example:**
```typescript
const content = await read('/home/user/workspace/package.json');
const pkg = JSON.parse(content);
console.log(pkg.name);
```



#### `write()`

Write content to a file. Creates the file if it doesn't exist.

**Parameters:**

- `filePath`: `string` - Path to the file

- `content`: `string` - Content to write

**Returns:** `Promise<void>`

**Example:**
```typescript
await write('/home/user/workspace/output.txt', 'Hello, world!');
```



#### `edit()`

Edit a file by replacing text.

**Parameters:**

- `filePath`: `string` - Path to the file

- `oldText`: `string` - Text to find (must be unique in file)

- `newText`: `string` - Text to replace with

**Returns:** `Promise<void>`

**Example:**
```typescript
await edit('/home/user/workspace/config.ts',
  'debug: false',
  'debug: true'
);
```



#### `glob()`

Find files matching a glob pattern.

**Parameters:**

- `pattern`: `string` - Glob pattern (e.g., "**\/*.ts")

- `cwd`: `any` (optional) - Directory to search in (default: /home/user/workspace)

**Returns:** `Promise<string[]>`

**Example:**
```typescript
const tsFiles = await glob('**\/*.ts');
console.log(`Found ${tsFiles.length} TypeScript files`);
```



#### `grep()`

Search file contents for a pattern.

**Parameters:**

- `pattern`: `string` - Regex pattern to search for

- `cwd`: `any` (optional) - Directory to search in (default: /home/user/workspace)

**Returns:** `Promise<Array<{ file: string; line: number; content: string }>>`

**Example:**
```typescript
const matches = await grep('TODO:');
for (const m of matches) {
  console.log(`${m.file}:${m.line}: ${m.content}`);
}
```



#### `ls()`

List directory contents.

**Parameters:**

- `dirPath`: `string` - Path to directory

**Returns:** `Promise<string[]>`

**Example:**
```typescript
const files = await ls('/home/user/workspace');
console.log(files);
```



### context

Context KSA - Knowledge, Skills, and Abilities Manage card context and variables that persist across stages. Use this to read the current context and set variables for later stages.

```typescript
import { setGatewayConfig, getContext, getVariable, setVariable } from './ksa/context';
```

#### `setGatewayConfig()`

Set the gateway config for cloud operations. Called by the runtime when starting a session.

**Parameters:**

- `config`: `{
  convexUrl: string;
  jwt: string;
  cardId?: string;
}` - 

**Returns:** `void`



#### `getContext()`

Get the current card's context. Includes variables set by previous stages and artifact references.

**Returns:** `Promise<CardContext>`

**Example:**
```typescript
const ctx = await getContext();
console.log(`Card: ${ctx.cardId}`);
console.log(`Variables: ${JSON.stringify(ctx.variables)}`);
console.log(`Artifacts: ${ctx.artifactCount}`);
```



#### `getVariable()`

Get a specific variable from the card context. Convenience wrapper around getContext().

**Parameters:**

- `key`: `string` - Variable name

**Returns:** `Promise<unknown>`

**Example:**
```typescript
const audience = await getVariable('targetAudience');
if (audience) {
  console.log(`Target: ${audience}`);
}
```



#### `setVariable()`

Set a variable in the card context. Variables persist across stages, so later stages can access them.

**Parameters:**

- `key`: `string` - Variable name

- `value`: `unknown` - Variable value (any JSON-serializable value)

**Returns:** `Promise<SetVariableResult>`

**Example:**
```typescript
// Set a string variable
await setVariable('targetAudience', 'enterprise developers');

// Set an object variable
await setVariable('researchFindings', {
  competitors: ['A', 'B', 'C'],
  marketSize: '$10B',
});

// Set a list variable
await setVariable('keyInsights', [
  'Market is growing 20% YoY',
  'Main competitor has 45% share',
]);
```



## Research & Information

### news

News KSA - Knowledge, Skills, and Abilities Advanced news research and monitoring via APITube. Supports entity tracking, sentiment analysis, brand monitoring.

```typescript
import { search, trending, breakingNews, monitorBrand, monitorOrganization, analyzeSentiment, compareTopics } from './ksa/news';
```

#### `search()`

Search for news articles with advanced filtering.

**Parameters:**

- `options`: `NewsSearchOptions` - Search options

**Returns:** `Promise<NewsArticle[]>`

**Example:**
```typescript
const articles = await search({
  query: 'artificial intelligence',
  category: 'science',
  sentiment: 'positive',
  limit: 20
});
for (const a of articles) {
  console.log(`[${a.sentiment?.polarity}] ${a.title}`);
}
```



#### `trending()`

Get trending news by category.

**Parameters:**

- `category`: `NewsCategory` - News category

- `limit`: `any` (optional) - Maximum articles (default: 10)

**Returns:** `Promise<NewsArticle[]>`

**Example:**
```typescript
const tech = await trending('science', 10);
for (const a of tech) {
  console.log(`${a.title} (${a.source.name})`);
}
```



#### `breakingNews()`

Get breaking news (most recent high-quality articles).

**Parameters:**

- `limit`: `any` (optional) - Maximum articles (default: 10)

**Returns:** `Promise<NewsArticle[]>`

**Example:**
```typescript
const breaking = await breakingNews(5);
for (const a of breaking) {
  console.log(`[${a.publishedAt}] ${a.title}`);
}
```



#### `monitorBrand()`

Monitor news about a brand.

**Parameters:**

- `brandName`: `string` - Brand name to monitor

- `options`: `{
    sentiment?: "positive" | "negative" | "neutral";
    days?: number;
    limit?: number;
  }` (optional) - Additional options

**Returns:** `Promise<NewsArticle[]>`

**Example:**
```typescript
const articles = await monitorBrand('Apple', { sentiment: 'negative', days: 7 });
console.log(`Found ${articles.length} negative articles about Apple`);
```



#### `monitorOrganization()`

Monitor news about an organization.

**Parameters:**

- `orgName`: `string` - Organization name

- `options`: `{
    sentiment?: "positive" | "negative" | "neutral";
    days?: number;
    limit?: number;
  }` (optional) - Additional options

**Returns:** `Promise<NewsArticle[]>`

**Example:**
```typescript
const articles = await monitorOrganization('Microsoft');
for (const a of articles) {
  console.log(`${a.title} - ${a.sentiment?.polarity}`);
}
```



#### `analyzeSentiment()`

Get sentiment distribution for a topic.

**Parameters:**

- `query`: `string` - Search query

- `days`: `any` (optional) - Number of days to analyze (default: 7)

**Returns:** `Promise<{ positive: number; negative: number; neutral: number; total: number }>`

**Example:**
```typescript
const sentiment = await analyzeSentiment('climate change', 30);
console.log(`Positive: ${sentiment.positive}%`);
console.log(`Negative: ${sentiment.negative}%`);
console.log(`Neutral: ${sentiment.neutral}%`);
```



#### `compareTopics()`

Compare news coverage between two topics.

**Parameters:**

- `topic1`: `string` - First topic

- `topic2`: `string` - Second topic

- `days`: `any` (optional) - Number of days (default: 7)

**Returns:** `Promise<{
  topic1: { query: string; count: number; avgSentiment: number };
  topic2: { query: string; count: number; avgSentiment: number };
}>`

**Example:**
```typescript
const comparison = await compareTopics('electric vehicles', 'hydrogen cars', 30);
console.log(`EV articles: ${comparison.topic1.count}`);
console.log(`H2 articles: ${comparison.topic2.count}`);
```



### web

Web KSA - Knowledge, Skills, and Abilities Functions for web search and content extraction. Import and use these in your code.

```typescript
import { search, scrape, news, brandNews, webResearch } from './ksa/web';
```

#### `search()`

Search the web for information.

**Parameters:**

- `query`: `string` - Search query string

- `options`: `{
    maxResults?: number;
    type?: 'all' | 'web' | 'news' | 'academic';
  }` (optional) - Optional search configuration

**Returns:** `Promise<SearchResult[]>`

**Example:**
```typescript
const results = await search('TypeScript best practices 2025');
for (const r of results) {
  console.log(`${r.title}: ${r.url}`);
}
```



#### `scrape()`

Extract clean content from a URL.

**Parameters:**

- `url`: `string` - URL to scrape

**Returns:** `Promise<ScrapedContent>`

**Example:**
```typescript
const content = await scrape('https://example.com/article');
console.log(content.markdown);
```



#### `news()`

Search for recent news articles using Valyu (recommended for research).

**Parameters:**

- `query`: `string` - News search query

- `limit`: `any` (optional) - Maximum articles to return (default: 10)

**Returns:** `Promise<NewsArticle[]>`

**Example:**
```typescript
const articles = await news('AI regulation');
for (const a of articles) {
  console.log(`[${a.source}] ${a.title}`);
}
```



#### `brandNews()`

Monitor brand mentions in news (uses APITube for brand-specific tracking). Use this for tracking specific brand/company mentions, not general research.

**Parameters:**

- `brandQuery`: `string` - Brand or company name to monitor

- `limit`: `any` (optional) - Maximum articles to return (default: 10)

**Returns:** `Promise<NewsArticle[]>`

**Example:**
```typescript
const mentions = await brandNews('Anthropic');
for (const m of mentions) {
  console.log(`[${m.source}] ${m.title}`);
}
```



#### `webResearch()`

Comprehensive web research combining search and news. Use this for thorough research on a topic.

**Parameters:**

- `query`: `string` - Research topic

- `options`: `{
    depth?: 'quick' | 'thorough';
    includeNews?: boolean;
  }` (optional) - Research options

**Returns:** `Promise<{
  sources: SearchResult[];
  articles: NewsArticle[];
}>`

**Example:**
```typescript
const research = await webResearch('multi-agent AI systems', { depth: 'thorough' });
console.log('Articles:', research.articles.length);
console.log('Sources:', research.sources.length);
```



### companies

Companies KSA - Knowledge, Skills, and Abilities Enrich and lookup company information including: - Domain/website enrichment - Company search - Industry classification - Employee counts, funding, tech stack

```typescript
import { enrichDomain, enrichCompany, bulkEnrich, searchCompanies, findSimilar, companiesByTech, getTechStack } from './ksa/companies';
```

#### `enrichDomain()`

Enrich a domain with company information.

**Parameters:**

- `domain`: `string` - Company domain (e.g., 'stripe.com')

**Returns:** `Promise<Company>`

**Example:**
```typescript
const company = await enrichDomain('stripe.com');
console.log(`${company.name}: ${company.employeeRange} employees`);
console.log(`Industry: ${company.industry}`);
```



#### `enrichCompany()`

Enrich a company by name.

**Parameters:**

- `name`: `string` - Company name

**Returns:** `Promise<Company>`

**Example:**
```typescript
const company = await enrichCompany('Stripe');
console.log(`Domain: ${company.domain}`);
console.log(`Founded: ${company.foundedYear}`);
```



#### `bulkEnrich()`

Bulk enrich multiple domains.

**Parameters:**

- `domains`: `string[]` - Array of domains to enrich

**Returns:** `Promise<Company[]>`

**Example:**
```typescript
const companies = await bulkEnrich(['stripe.com', 'notion.so', 'figma.com']);
for (const c of companies) {
  console.log(`${c.name}: ${c.industry}`);
}
```



#### `searchCompanies()`

Search for companies by various criteria.

**Parameters:**

- `options`: `{
  query?: string;
  industry?: string;
  country?: string;
  state?: string;
  city?: string;
  employeeMin?: number;
  employeeMax?: number;
  revenueMin?: string;
  revenueMax?: string;
  techStack?: string[];
  limit?: number;
  page?: number;
}` - Search options

**Returns:** `Promise<CompanySearchResult>`

**Example:**
```typescript
const results = await searchCompanies({
  industry: 'SaaS',
  employeeMin: 50,
  employeeMax: 500,
  country: 'US'
});
for (const c of results.companies) {
  console.log(`${c.name} (${c.domain}): ${c.employeeRange}`);
}
```



#### `findSimilar()`

Find similar companies to a given domain.

**Parameters:**

- `domain`: `string` - Reference company domain

- `limit`: `any` (optional) - Maximum results (default: 10)

**Returns:** `Promise<Company[]>`

**Example:**
```typescript
const similar = await findSimilar('stripe.com', 5);
for (const c of similar) {
  console.log(`${c.name}: ${c.description?.slice(0, 50)}`);
}
```



#### `companiesByTech()`

Get companies using a specific technology.

**Parameters:**

- `technology`: `string` - Technology name (e.g., 'React', 'Stripe', 'AWS')

- `options`: `{
    country?: string;
    employeeMin?: number;
    limit?: number;
  }` (optional) - Additional filters

**Returns:** `Promise<Company[]>`

**Example:**
```typescript
const companies = await companiesByTech('Stripe', { country: 'US', limit: 20 });
console.log(`Found ${companies.length} companies using Stripe`);
```



#### `getTechStack()`

Get company tech stack.

**Parameters:**

- `domain`: `string` - Company domain

**Returns:** `Promise<string[]>`

**Example:**
```typescript
const tech = await getTechStack('stripe.com');
console.log('Technologies:', tech.join(', '));
```



## Content Creation

### pdf

PDF Skills Functions for generating PDF documents from markdown.

```typescript
import { generate } from './ksa/pdf';
```

#### `generate()`

Generate a PDF from markdown content.

**Parameters:**

- `params`: `GenerateParams` - Object with filename, content, and optional title

**Returns:** `Promise<PdfResult>`

**Example:**
```typescript
await generate({
  filename: 'my-report',
  content: '# Report\n\nContent here...',
  title: 'Quarterly Report'
});
// Creates /home/user/artifacts/my-report.pdf
```



### artifacts

Artifacts KSA - Knowledge, Skills, and Abilities Save and retrieve artifacts that persist across sandbox sessions. Use this to create outputs that will be available after the agent finishes. CATEGORY: core

```typescript
import { setGatewayConfig, saveArtifact, readArtifact, listArtifacts } from './ksa/artifacts';
```

#### `setGatewayConfig()`

Set the gateway config for cloud operations. Called by the runtime when starting a session.

**Parameters:**

- `config`: `{
  convexUrl: string;
  jwt: string;
  cardId?: string;
}` - 

**Returns:** `void`



#### `saveArtifact()`

Save an artifact to the cloud. Use this for markdown, JSON, CSV, or text files. For PDFs, use the `pdf.generate()` function instead. For emails, use the `email.send()` function instead.

**Parameters:**

- `params`: `SaveArtifactParams` - Name, type, content, and optional metadata

**Returns:** `Promise<SaveResult>`

**Example:**
```typescript
// Save a markdown report
const result = await saveArtifact({
  name: 'competitive-analysis.md',
  type: 'markdown',
  content: '# Competitive Analysis\n\n## Overview\n...',
});

if (result.success) {
  console.log(`Saved: ${result.name} (${result.id})`);
}

// Save JSON data
await saveArtifact({
  name: 'research-data.json',
  type: 'json',
  content: JSON.stringify(data, null, 2),
});
```



#### `readArtifact()`

Read an artifact by its ID. Use this to access documents created in earlier stages.

**Parameters:**

- `artifactId`: `string` - ID of the artifact (from context artifacts list)

**Returns:** `Promise<ReadResult>`

**Example:**
```typescript
const report = await readArtifact('abc123');
if (report.success) {
  console.log(report.content);
}
```



#### `listArtifacts()`

List all artifacts for the current card. Shows artifacts from all stages.

**Returns:** `Promise<ListResult>`

**Example:**
```typescript
const { artifacts } = await listArtifacts();
for (const art of artifacts) {
  console.log(`${art.name} (${art.type})`);
}
```



### email

Email KSA - Knowledge, Skills, and Abilities Send emails via SendGrid. Supports: - Plain text and HTML emails - Multiple recipients (to, cc, bcc) - Attachments - Templates

```typescript
import { send, sendText, sendHtml, sendWithAttachment, sendTemplate, sendBulk } from './ksa/email';
```

#### `send()`

Send an email.

**Parameters:**

- `options`: `EmailOptions` - Email options

**Returns:** `Promise<EmailResult>`

**Example:**
```typescript
await send({
  to: 'user@example.com',
  subject: 'Hello from the agent',
  text: 'This is a test email sent by the AI agent.'
});
```



#### `sendText()`

Send a simple text email.

**Parameters:**

- `to`: `string` - Recipient email

- `subject`: `string` - Email subject

- `body`: `string` - Email body text

**Returns:** `Promise<EmailResult>`

**Example:**
```typescript
await sendText('user@example.com', 'Task Complete', 'Your report is ready.');
```



#### `sendHtml()`

Send an HTML email.

**Parameters:**

- `to`: `string` - Recipient email

- `subject`: `string` - Email subject

- `html`: `string` - HTML body

**Returns:** `Promise<EmailResult>`

**Example:**
```typescript
await sendHtml('user@example.com', 'Report', '<h1>Monthly Report</h1><p>...</p>');
```



#### `sendWithAttachment()`

Send an email with an attachment.

**Parameters:**

- `to`: `string` - Recipient email

- `subject`: `string` - Email subject

- `body`: `string` - Email body

- `attachment`: `{
    content: string;
    filename: string;
    type?: string;
  }` - Attachment details

**Returns:** `Promise<EmailResult>`

**Example:**
```typescript
import { read } from './ksa/file';

// Read file as base64
const pdfContent = await read('/home/user/artifacts/report.pdf', { encoding: 'base64' });

await sendWithAttachment(
  'user@example.com',
  'Your Report',
  'Please find the report attached.',
  {
    content: pdfContent,
    filename: 'report.pdf',
    type: 'application/pdf'
  }
);
```



#### `sendTemplate()`

Send an email using a SendGrid template.

**Parameters:**

- `to`: `string` - Recipient email

- `templateId`: `string` - SendGrid template ID

- `data`: `Record<string, any>` - Dynamic template data

- `subject`: `string` (optional) - Optional subject override

**Returns:** `Promise<EmailResult>`

**Example:**
```typescript
await sendTemplate(
  'user@example.com',
  'd-abc123...',
  { name: 'John', orderNumber: '12345' }
);
```



#### `sendBulk()`

Send emails to multiple recipients.

**Parameters:**

- `recipients`: `string[]` - Array of recipient emails

- `subject`: `string` - Email subject

- `body`: `string` - Email body

**Returns:** `Promise<EmailResult>`

**Example:**
```typescript
await sendBulk(
  ['user1@example.com', 'user2@example.com'],
  'Team Update',
  'Here is the weekly team update...'
);
```


