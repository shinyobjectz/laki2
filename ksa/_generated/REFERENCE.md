# KSA Reference Documentation

> Auto-generated from KSA source files.
> Generated at: 2026-01-17T17:36:27.663Z


## Core KSAs (Always Available)

### beads

Beads KSA - Knowledge, Skills, and Abilities Task planning and tracking for agent workflows. Use beads to break down work into trackable tasks, track progress, and coordinate retries. OPTIMIZATION: update() and close() use fire-and-forget by default to reduce latency. Set { blocking: true } for synchronous behavior.

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

Update an existing task. Uses fire-and-forget by default for speed. Set blocking: true to wait.

**Parameters:**

- `id`: `string` - Task ID

- `options`: `UpdateOptions` - Fields to update

**Returns:** `Promise<void>`

**Example:**
```typescript
// Non-blocking (default) - faster
update('task-1', { status: 'in_progress' });

// Blocking - wait for confirmation
await update('task-1', { status: 'in_progress', blocking: true });
```



#### `close()`

Close a task as completed. Uses fire-and-forget by default for speed.

**Parameters:**

- `id`: `string` - Task ID

- `reason`: `string` (optional) - Optional completion reason

- `options`: `CloseOptions` (optional) - Optional settings (blocking: true to wait)

**Returns:** `Promise<void>`

**Example:**
```typescript
// Non-blocking (default) - faster
close('task-1', 'Successfully generated report');

// Blocking - wait for confirmation
await close('task-1', 'Done', { blocking: true });
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



### artifacts

Artifacts KSA - Knowledge, Skills, and Abilities Save and retrieve artifacts that persist across sandbox sessions. Use this to create outputs that will be available after the agent finishes. CATEGORY: core

```typescript
import { setGatewayConfig, saveArtifact, readArtifact, listArtifacts } from './ksa/artifacts';
```

#### `setGatewayConfig()`



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

List all artifacts for the current context (thread or card). For threads: Shows artifacts saved in this chat thread. For cards: Shows artifacts from all stages.

**Returns:** `Promise<ListResult>`

**Example:**
```typescript
const { artifacts } = await listArtifacts();
for (const art of artifacts) {
  console.log(`${art.name} (${art.type})`);
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



## Skills KSAs (Research & Data)

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



### brandscan

Brand Lookup KSA - Knowledge, Skills, and Abilities Lightweight brand lookups for AI agents. Uses existing brand library data or fast API lookups. IMPORTANT: This KSA does NOT trigger full brand scans. Full scans involve web crawling and can take minutes. For agent tasks, use these lightweight lookups instead.

```typescript
import { lookupBrand, searchBrands, getBrandFromLibrary, getBrandData, getBrandSummary, listBrands, getBrandByDomain } from './ksa/brandscan';
```

#### `lookupBrand()`

Look up basic brand information - SAFE FOR AGENTS. This function: - Checks the brand library first (instant) - Falls back to lightweight API lookup (Brand.dev, TheCompanies) - NEVER triggers web crawling or full brand scans - Returns in seconds, not minutes

**Parameters:**

- `domain`: `string` - The domain to look up (e.g., 'anthropic.com')

**Returns:** `Promise<BrandLite | null>`

**Example:**
```typescript
const brand = await lookupBrand('anthropic.com');
if (brand) {
  console.log(`${brand.name} - ${brand.industry}`);
  console.log(`Founded: ${brand.yearFounded}`);
  console.log(`Source: ${brand.source}`); // 'library' or 'api'
}
```



#### `searchBrands()`

Search for brands by name - SAFE FOR AGENTS. Returns a list of matching brands with basic info. Use this when you have a company name but not a domain.

**Parameters:**

- `query`: `string` - The brand name to search for

- `limit`: `any` (optional) - Maximum results (default: 5)

**Returns:** `Promise<BrandSearchResult[]>`

**Example:**
```typescript
const results = await searchBrands('Nike');
for (const r of results) {
  console.log(`${r.name} - ${r.domain}`);
}
```



#### `getBrandFromLibrary()`

Get brand from library only - SAFE FOR AGENTS. Only returns brands that exist in the library. Returns null if brand hasn't been scanned yet. Use this when you specifically need library data.

**Parameters:**

- `domain`: `string` - The domain to look up

**Returns:** `Promise<BrandLite | null>`

**Example:**
```typescript
const brand = await getBrandFromLibrary('anthropic.com');
if (brand) {
  console.log('Found in library:', brand.name);
} else {
  console.log('Brand not yet scanned');
}
```



#### `getBrandData()`

Get full brand data from library - READ ONLY. Returns complete brand data including styleguide, products, and ads. Only works for brands that have been scanned and added to the library.

**Parameters:**

- `brandId`: `string` - The brand ID

**Returns:** `Promise<BrandData>`

**Example:**
```typescript
const brand = await getBrandData(brandId);
console.log('Brand:', brand.name);
console.log('Colors:', brand.styleguide?.colors);
console.log('Products:', brand.products?.length);
```



#### `getBrandSummary()`

Get brand intelligence summary - READ ONLY. Lighter weight than full data, returns counts.

**Parameters:**

- `brandId`: `string` - The brand ID

**Returns:** `Promise<{
  brandId: string;
  name: string;
  domain: string;
  productCount: number;
  assetCount: number;
  adCount: number;
  socialPostCount: number;
}>`

**Example:**
```typescript
const summary = await getBrandSummary(brandId);
console.log(`${summary.productCount} products, ${summary.adCount} ads`);
```



#### `listBrands()`

List all brands in the library - READ ONLY.

**Returns:** `Promise<BrandData[]>`

**Example:**
```typescript
const brands = await listBrands();
for (const b of brands) {
  console.log(`${b.name} (${b.domain})`);
}
```



#### `getBrandByDomain()`

Get brand by domain from library - READ ONLY.

**Parameters:**

- `domain`: `string` - The domain to look up

**Returns:** `Promise<BrandData | null>`

**Example:**
```typescript
const brand = await getBrandByDomain('anthropic.com');
if (brand) {
  console.log('Found:', brand.name);
}
```



### boardDSL

Board DSL KSA - Create boards from YAML definitions Instead of making multiple API calls, define your entire board in YAML and create it atomically with a single function call.

```typescript
import { createBoardFromYAML, validateBoardYAML } from './ksa/boardDSL';
```

#### `createBoardFromYAML()`

Create a board from a YAML definition. This is the PREFERRED way to create boards. Write your board as YAML, then call this function to create it atomically.

**Parameters:**

- `yamlContent`: `string` - YAML string defining the board

**Returns:** `Promise<string>`

**Example:**
```typescript
const boardId = await createBoardFromYAML(`
name: Research Pipeline
description: Automated research workflow

trigger:
  name: Research Request
  methods:
    prompt: true
  chat:
    systemPrompt: Research the given topic thoroughly
    placeholder: What would you like me to research?
    images: true
    files: true
    urls: true

stages:
  - name: Gather Sources
    type: agent
    goals:
      - Find 5-10 authoritative sources
      - Include academic papers if relevant
      - Verify source credibility
    skills:
      - web
      - news
      - pdf
    deliverables:
      - name: Source List
        type: artifact
        description: Curated list of sources with summaries

  - name: Synthesize Findings
    type: agent
    goals:
      - Extract key insights from each source
      - Identify patterns and contradictions
      - Create coherent narrative
    skills:
      - context
      - artifacts
    deliverables:
      - name: Research Report
        type: report
        description: Comprehensive analysis of findings

  - name: Review
    type: human
    goals:
      - Verify accuracy
      - Request clarifications if needed
`);
```



#### `validateBoardYAML()`

Validate a YAML board definition without creating it. Use this to check for errors before creating.

**Parameters:**

- `yamlContent`: `string` - YAML string to validate

**Returns:** `{
  valid: boolean;
  errors: string[];
  summary?: {
    name: string;
    stageCount: number;
    hasTrigger: boolean;
    triggerMethods: string[];
  };
}`

**Example:**
```typescript
const result = validateBoardYAML(yaml);
if (result.valid) {
  console.log('Board definition is valid!');
  console.log('Summary:', result.summary);
} else {
  console.log('Errors:', result.errors);
}
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



### boards

Boards KSA - Knowledge, Skills, and Abilities Manage and execute kanban boards programmatically. Use this to create boards, add cards, and trigger automated execution. IMPORTANT: When creating boards, ALWAYS design appropriate stages. Each stage needs: name, stageType ('agent' or 'human'), and optionally goals.

```typescript
import { listBoards, getBoard, createBoard, setTrigger, addCard, runCard, getCardStatus, waitForCard, stopCard, getCompletedCards, listTemplates, getTemplate, createBoardFromTemplate } from './ksa/boards';
```

#### `listBoards()`

List all boards accessible to the current user.

**Parameters:**

- `orgId`: `string` (optional) - Optional organization ID to filter by

**Returns:** `Promise<Board[]>`

**Example:**
```typescript
const boards = await listBoards();
for (const b of boards) {
  console.log(`${b.name} - ${b.stages.length} stages`);
}
```



#### `getBoard()`

Get a board with its stages and configuration.

**Parameters:**

- `boardId`: `string` - The board ID

**Returns:** `Promise<Board | null>`

**Example:**
```typescript
const board = await getBoard('abc123');
console.log(`${board.name} has ${board.stages.length} stages`);
```



#### `createBoard()`

Create a new board with optional custom stages.

**Parameters:**

- `name`: `string` - Board name

- `options`: `{
    description?: string;
    template?: string;
    stages?: StageConfig[];
    trigger?: TriggerConfig;
    workspaceMode?: "per_card" | "shared";
  }` (optional) - Optional configuration including stages

**Returns:** `Promise<string>`

**Example:**
```typescript
// Create a simple board with default stages (Backlog, In Progress, Done)
const boardId = await createBoard('My Board');

// Create a board with custom stages
const boardId = await createBoard('Content Pipeline', {
  stages: [
    { name: 'Research', stageType: 'agent', goals: ['Find 5 sources'] },
    { name: 'Write', stageType: 'agent', skills: ['web', 'pdf'] },
    { name: 'Review', stageType: 'human' }
  ]
});

// Create from a template
const boardId = await createBoard('My Research', { template: 'research-report' });
```



#### `setTrigger()`

Set the trigger configuration for a board. Triggers define how cards are created on the board.

**Parameters:**

- `boardId`: `string` - The board ID

- `trigger`: `TriggerConfig` - The trigger configuration

**Returns:** `Promise<void>`

**Example:**
```typescript
// Set a chat-based trigger
await setTrigger(boardId, {
  name: 'Chat Trigger',
  methods: { prompt: true, webform: false, webhook: false, mcp: false },
  chat: {
    images: { enabled: true, maxSize: '10MB' },
    files: { enabled: true, maxSize: '25MB', types: ['pdf', 'docx'] },
    urls: { enabled: true, scrape: true },
    systemPrompt: 'You are analyzing brand data...',
    startWithPlan: true,
  },
  form: { fields: [] },
});
```



#### `addCard()`

Add a card to a board.

**Parameters:**

- `boardId`: `string` - The board ID

- `taskId`: `string` - Unique task identifier

- `name`: `string` - Card name/title

- `options`: `{
    data?: Record<string, unknown>;
    autoRun?: boolean;
  }` (optional) - Optional card configuration

**Returns:** `Promise<string>`

**Example:**
```typescript
const cardId = await addCard(boardId, 'task-001', 'Research AI trends', {
  data: { topic: 'generative AI', depth: 'thorough' },
  autoRun: true
});
```



#### `runCard()`

Run a card through the board pipeline. Triggers execution starting from the current stage.

**Parameters:**

- `cardId`: `string` - The card ID to execute

**Returns:** `Promise<BoardExecutionResult>`

**Example:**
```typescript
const result = await runCard(cardId);
if (result.status === 'completed') {
  console.log('Artifacts:', result.artifacts);
}
```



#### `getCardStatus()`

Get the current status of a card.

**Parameters:**

- `cardId`: `string` - The card ID

**Returns:** `Promise<CardStatus>`

**Example:**
```typescript
const status = await getCardStatus(cardId);
console.log(`Card is ${status.status} at stage ${status.stageName}`);
```



#### `waitForCard()`

Wait for a card to complete execution. Polls the card status until it completes, fails, or times out.

**Parameters:**

- `cardId`: `string` - The card ID

- `timeoutMs`: `any` (optional) - Maximum wait time in milliseconds (default: 5 minutes)

**Returns:** `Promise<BoardExecutionResult>`

**Example:**
```typescript
// Wait up to 10 minutes for completion
const result = await waitForCard(cardId, 600000);
if (result.status === 'completed') {
  console.log('Done! Artifacts:', result.artifacts);
}
```



#### `stopCard()`

Stop a running card.

**Parameters:**

- `cardId`: `string` - The card ID to stop

**Returns:** `Promise<void>`

**Example:**
```typescript
await stopCard(cardId);
```



#### `getCompletedCards()`

Get cards that have completed execution.

**Parameters:**

- `boardId`: `string` - The board ID

- `limit`: `any` (optional) - Maximum cards to return (default: 10)

**Returns:** `Promise<Card[]>`

**Example:**
```typescript
const completed = await getCompletedCards(boardId, 5);
for (const card of completed) {
  console.log(`${card.name} - completed`);
}
```



#### `listTemplates()`

List available board templates. Templates provide pre-configured workflows for common use cases.

**Parameters:**

- `category`: `string` (optional) - Optional category filter

**Returns:** `Promise<BoardTemplate[]>`

**Example:**
```typescript
const templates = await listTemplates();
for (const t of templates) {
  console.log(`${t.name}: ${t.description}`);
}

// Filter by category
const researchTemplates = await listTemplates('research');
```



#### `getTemplate()`

Get details of a specific template including its stages.

**Parameters:**

- `templateId`: `string` - The template ID

**Returns:** `Promise<{
  id: string;
  name: string;
  description: string;
  stages: Array<{
    name: string;
    stageType: "agent" | "human";
    description: string;
    skills: Array<{ id: string; name: string; icon: string }>;
    deliverables: Array<{ id: string; type: string; name: string }>;
    goals: Array<{ id: string; text: string; done: boolean }>;
  }>;
} | null>`

**Example:**
```typescript
const template = await getTemplate('research-report');
console.log(`${template.name} has ${template.stages.length} stages`);
```



#### `createBoardFromTemplate()`

Create a board from a template. This is a shortcut for createBoard with template option. Available templates: - 'research-report': Research a topic and generate PDF report - 'content-pipeline': Create blog posts/articles with outline→draft→polish flow - 'data-analysis': Process data, analyze, and generate insights report - 'competitor-research': Research competitors and create competitive analysis - 'social-monitoring': Monitor social media mentions and sentiment

**Parameters:**

- `templateId`: `string` - The template ID to use

- `name`: `string` (optional) - Optional custom name for the board

**Returns:** `Promise<string>`

**Example:**
```typescript
// Create a research board
const boardId = await createBoardFromTemplate('research-report', 'AI Trends Research');

// Create a content pipeline
const boardId = await createBoardFromTemplate('content-pipeline', 'Q4 Blog Posts');
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



### workspaces

Workspaces KSA - Knowledge, Skills, and Abilities Create and manage design workspaces with canvas tools. Workspaces contain frames, designs, and collaborative elements.

```typescript
import { listWorkspaces, createWorkspace, getWorkspace, updateWorkspaceName, deleteWorkspace, getCanvas, saveCanvas, addCanvasElement, removeCanvasElement, updateCanvasElement, addConnection, listDesigns, saveDesign } from './ksa/workspaces';
```

#### `listWorkspaces()`

List all workspaces.

**Parameters:**

- `orgId`: `string` (optional) - Optional organization ID to filter by

**Returns:** `Promise<Workspace[]>`

**Example:**
```typescript
const workspaces = await listWorkspaces();
for (const ws of workspaces) {
  console.log(`${ws.name} - ${ws.canvas?.elements.length || 0} elements`);
}
```



#### `createWorkspace()`

Create a new workspace.

**Parameters:**

- `name`: `string` - Workspace name

- `orgId`: `string` (optional) - Optional organization ID

**Returns:** `Promise<string>`

**Example:**
```typescript
const workspaceId = await createWorkspace('Q1 Campaign Designs');
```



#### `getWorkspace()`

Get workspace details.

**Parameters:**

- `workspaceId`: `string` - The workspace ID

**Returns:** `Promise<Workspace | null>`

**Example:**
```typescript
const workspace = await getWorkspace(workspaceId);
console.log(`Canvas has ${workspace.canvas?.elements.length} elements`);
```



#### `updateWorkspaceName()`

Update workspace name.

**Parameters:**

- `workspaceId`: `string` - The workspace ID

- `name`: `string` - New workspace name

**Returns:** `Promise<void>`

**Example:**
```typescript
await updateWorkspaceName(workspaceId, 'Rebranded Workspace');
```



#### `deleteWorkspace()`

Delete a workspace.

**Parameters:**

- `workspaceId`: `string` - The workspace ID to delete

**Returns:** `Promise<void>`

**Example:**
```typescript
await deleteWorkspace(workspaceId);
```



#### `getCanvas()`

Get the canvas state for a workspace.

**Parameters:**

- `workspaceId`: `string` - The workspace ID

**Returns:** `Promise<CanvasState | null>`

**Example:**
```typescript
const canvas = await getCanvas(workspaceId);
for (const el of canvas?.elements || []) {
  console.log(`${el.data.nodeType}: ${el.data.label}`);
}
```



#### `saveCanvas()`

Save/update the canvas state.

**Parameters:**

- `workspaceId`: `string` - The workspace ID

- `canvas`: `CanvasState` - The canvas state to save

**Returns:** `Promise<void>`

**Example:**
```typescript
await saveCanvas(workspaceId, {
  version: '1.0',
  elements: [...],
  connections: [],
  viewport: { offset: { x: 0, y: 0 }, zoom: 1 }
});
```



#### `addCanvasElement()`

Add an element to the workspace canvas.

**Parameters:**

- `workspaceId`: `string` - The workspace ID

- `element`: `CanvasElement` - The element to add

**Returns:** `Promise<string>`

**Example:**
```typescript
const elementId = await addCanvasElement(workspaceId, {
  id: crypto.randomUUID(),
  position: { x: 100, y: 100 },
  size: { width: 400, height: 300 },
  data: {
    nodeType: 'frame',
    label: 'Hero Section',
    frameId: 'frame-123'
  }
});
```



#### `removeCanvasElement()`

Remove an element from the canvas.

**Parameters:**

- `workspaceId`: `string` - The workspace ID

- `elementId`: `string` - The element ID to remove

**Returns:** `Promise<void>`

**Example:**
```typescript
await removeCanvasElement(workspaceId, elementId);
```



#### `updateCanvasElement()`

Update an element's properties.

**Parameters:**

- `workspaceId`: `string` - The workspace ID

- `elementId`: `string` - The element ID

- `updates`: `Partial<CanvasElement>` - Properties to update

**Returns:** `Promise<void>`

**Example:**
```typescript
await updateCanvasElement(workspaceId, elementId, {
  position: { x: 200, y: 200 },
  data: { label: 'Updated Label' }
});
```



#### `addConnection()`

Add a connection between two elements.

**Parameters:**

- `workspaceId`: `string` - The workspace ID

- `connection`: `Connection` - The connection to add

**Returns:** `Promise<string>`

**Example:**
```typescript
const connId = await addConnection(workspaceId, {
  id: crypto.randomUUID(),
  source: 'element-1',
  target: 'element-2'
});
```



#### `listDesigns()`

List designs in a workspace.

**Parameters:**

- `workspaceId`: `string` - The workspace ID

**Returns:** `Promise<Design[]>`

**Example:**
```typescript
const designs = await listDesigns(workspaceId);
```



#### `saveDesign()`

Save a design.

**Parameters:**

- `workspaceId`: `string` - The workspace ID

- `design`: `Omit<Design, "_id" | "_creationTime" | "workspaceId">` - The design data

**Returns:** `Promise<string>`

**Example:**
```typescript
const designId = await saveDesign(workspaceId, {
  name: 'Homepage V1',
  slug: 'homepage-v1',
  elements: [...],
  status: 'draft'
});
```



### logger

Logger KSA - Knowledge, Skills, and Abilities for Semantic Logging Provides clean, user-friendly logging functions that emit structured logs for beautiful UI display using ai-elements components. Usage in agent code: ```typescript import { log, logPlan, logTask, logThinking, logSearch, logSource } from './ksa/logger'; // Simple log log.info("Starting analysis..."); // Planning logPlan("Research Project", "Gathering information about the topic", [ { title: "Search web", status: "complete" }, { title: "Analyze results", status: "active" }, { title: "Generate report", status: "pending" }, ]); // Task completion logTask("Collected 5 data sources", true); // Thinking/reasoning logThinking("Evaluating which sources are most relevant..."); // Search results logSearch("Web research", [ { title: "Article 1", url: "https://...", description: "..." }, ]); // Sources/citations logSource("Wikipedia", "https://wikipedia.org/...", "Background information"); ```

```typescript
import { logPlan, logThinking, logTask, logSearch, logSource, logFile, logTool, createProgress } from './ksa/logger';
```

#### `logPlan()`

Log an execution plan with steps. Renders as a Plan component in the UI.

**Parameters:**

- `title`: `string` - 

- `description`: `string` - 

- `steps`: `PlanStep[]` - 

**Returns:** `void`

**Example:**
```typescript
logPlan("Research Task", "Gathering market intelligence", [
  { title: "Search competitors", status: "complete" },
  { title: "Analyze pricing", status: "active" },
  { title: "Generate report", status: "pending" },
]);
```



#### `logThinking()`

Log a thinking/reasoning step. Renders as a ChainOfThought step in the UI.

**Parameters:**

- `message`: `string` - 

- `description`: `string` (optional) - 

**Returns:** `void`

**Example:**
```typescript
logThinking("Analyzing the data patterns to identify trends...");
```



#### `logTask()`

Log a task as in-progress or completed. Renders as a Queue item in the UI.

**Parameters:**

- `label`: `string` - 

- `completed`: `boolean` (optional) - 

- `description`: `string` (optional) - 

**Returns:** `void`

**Example:**
```typescript
logTask("Fetching user data", false);  // In progress
logTask("Fetched 150 records", true);  // Completed
```



#### `logSearch()`

Log search results. Renders as ChainOfThoughtSearchResults in the UI.

**Parameters:**

- `label`: `string` - 

- `results`: `SearchResult[]` - 

**Returns:** `void`

**Example:**
```typescript
logSearch("Market research", [
  { title: "Industry Report 2024", url: "https://...", description: "..." },
  { title: "Competitor Analysis", url: "https://...", description: "..." },
]);
```



#### `logSource()`

Log a source/citation. Renders in the Sources component in the UI.

**Parameters:**

- `title`: `string` - 

- `url`: `string` - 

- `description`: `string` (optional) - 

**Returns:** `void`

**Example:**
```typescript
logSource("Wikipedia", "https://en.wikipedia.org/...", "Background context");
```



#### `logFile()`

Log a file operation. Renders with file icon in the UI.

**Parameters:**

- `operation`: `'read' | 'write' | 'edit'` - 

- `path`: `string` - 

- `label`: `string` - 

**Returns:** `void`

**Example:**
```typescript
logFile("read", "/path/to/file.txt", "Reading configuration");
logFile("write", "/output/report.pdf", "Generated PDF report");
```



#### `logTool()`

Log a tool/action execution. Renders with tool icon in the UI.

**Parameters:**

- `toolName`: `string` - 

- `label`: `string` - 

- `details`: `string` (optional) - 

**Returns:** `void`

**Example:**
```typescript
logTool("browser", "Taking screenshot of dashboard");
logTool("api", "Calling external service");
```



#### `createProgress()`

Create a progress tracker for multi-step operations.

**Parameters:**

- `title`: `string` - 

- `totalSteps`: `number` - 

**Returns:** `void`

**Example:**
```typescript
const progress = createProgress("Data Processing", 4);
progress.step("Loading data");
progress.step("Cleaning data");
progress.step("Analyzing patterns");
progress.complete("Processing complete");
```



### frames

Frames KSA - Knowledge, Skills, and Abilities Create and manage visual frames (HTML/Tailwind/Svelte components). Frames are stored in Convex and rendered via SecureFrame in sandboxed iframes.

```typescript
import { createFrame, getFrame, listFrames, updateFrame, deleteFrame, generateFrame, createPage, getPage, listPages, updatePage, getTemplates, getAdSpecs, snapshotFrame, rollbackFrame, trackView, trackConversion } from './ksa/frames';
```

#### `createFrame()`

Create a new frame.

**Parameters:**

- `workspaceId`: `string` - The workspace ID

- `options`: `{
    name: string;
    code: string;
    codeType?: "html" | "svelte" | "htmx" | "tailwind";
    dimensions?: { width: number; height: number };
    adMeta?: Frame["adMeta"];
    sectionMeta?: Frame["sectionMeta"];
    cssVariables?: Record<string, string>;
  }` - Frame configuration

**Returns:** `Promise<string>`

**Example:**
```typescript
const frameId = await createFrame(workspaceId, {
  name: 'Call to Action',
  code: '<div class="bg-blue-600 text-white p-8 rounded-lg">...</div>',
  codeType: 'tailwind',
  dimensions: { width: 800, height: 400 }
});
```



#### `getFrame()`

Get a frame by ID.

**Parameters:**

- `frameId`: `string` - The frame ID

**Returns:** `Promise<Frame | null>`

**Example:**
```typescript
const frame = await getFrame(frameId);
console.log(`${frame.name}: ${frame.codeType}`);
```



#### `listFrames()`

List frames in a workspace.

**Parameters:**

- `workspaceId`: `string` - The workspace ID

**Returns:** `Promise<Frame[]>`

**Example:**
```typescript
const frames = await listFrames(workspaceId);
for (const f of frames) {
  console.log(`${f.name} (${f.codeType}) - ${f.status}`);
}
```



#### `updateFrame()`

Update a frame.

**Parameters:**

- `frameId`: `string` - The frame ID

- `updates`: `{
    name?: string;
    code?: string;
    codeType?: "html" | "svelte" | "htmx" | "tailwind";
    dimensions?: { width: number; height: number };
    status?: "draft" | "published" | "archived";
    cssVariables?: Record<string, string>;
  }` - Properties to update

**Returns:** `Promise<void>`

**Example:**
```typescript
await updateFrame(frameId, {
  name: 'Updated Hero',
  code: '<section>...</section>',
  status: 'published'
});
```



#### `deleteFrame()`

Delete a frame.

**Parameters:**

- `frameId`: `string` - The frame ID to delete

**Returns:** `Promise<void>`

**Example:**
```typescript
await deleteFrame(frameId);
```



#### `generateFrame()`

Generate a frame from a description using AI. Creates HTML/Tailwind code based on the natural language description.

**Parameters:**

- `workspaceId`: `string` - The workspace ID

- `description`: `string` - Natural language description of the desired frame

- `options`: `{
    style?: "modern" | "minimal" | "bold" | "corporate";
    dimensions?: { width: number; height: number };
    codeType?: "html" | "tailwind" | "svelte";
  }` (optional) - Optional generation settings

**Returns:** `Promise<string>`

**Example:**
```typescript
const frameId = await generateFrame(workspaceId,
  'A modern hero section with a gradient background from purple to blue, ' +
  'centered white text with a headline and subheadline, and a glowing CTA button'
);
```



#### `createPage()`

Create a page (container for multiple frames).

**Parameters:**

- `workspaceId`: `string` - The workspace ID

- `options`: `{
    title: string;
    pageType?: "landing" | "multi";
    frameRefs?: Array<{ frameId: string; order: number }>;
  }` - Page configuration

**Returns:** `Promise<string>`

**Example:**
```typescript
const pageId = await createPage(workspaceId, {
  title: 'Landing Page',
  pageType: 'landing',
  frameRefs: [
    { frameId: heroFrameId, order: 0 },
    { frameId: featuresFrameId, order: 1 }
  ]
});
```



#### `getPage()`

Get a page by ID.

**Parameters:**

- `pageId`: `string` - The page ID

**Returns:** `Promise<Page | null>`

**Example:**
```typescript
const page = await getPage(pageId);
console.log(`${page.title} has ${page.frameRefs.length} frames`);
```



#### `listPages()`

List pages in a workspace.

**Parameters:**

- `workspaceId`: `string` - The workspace ID

**Returns:** `Promise<Page[]>`

**Example:**
```typescript
const pages = await listPages(workspaceId);
```



#### `updatePage()`

Update a page.

**Parameters:**

- `pageId`: `string` - The page ID

- `updates`: `{
    title?: string;
    frameRefs?: Array<{ frameId: string; order: number }>;
    isPublished?: boolean;
    status?: "draft" | "published" | "archived";
  }` - Properties to update

**Returns:** `Promise<void>`

**Example:**
```typescript
await updatePage(pageId, {
  title: 'Updated Landing Page',
  frameRefs: [{ frameId: newHeroId, order: 0 }],
  isPublished: true
});
```



#### `getTemplates()`

Get available frame templates.

**Returns:** `Promise<FrameTemplate[]>`

**Example:**
```typescript
const templates = await getTemplates();
for (const t of templates) {
  console.log(`${t.name} (${t.category})`);
}
```



#### `getAdSpecs()`

Get ad specifications for different platforms.

**Parameters:**

- `platform`: `string` (optional) - Optional platform to filter by

**Returns:** `Promise<AdSpec[]>`

**Example:**
```typescript
const specs = await getAdSpecs('meta');
for (const s of specs) {
  console.log(`${s.format}: ${s.width}x${s.height}`);
}
```



#### `snapshotFrame()`

Create a version snapshot of a frame.

**Parameters:**

- `frameId`: `string` - The frame ID

**Returns:** `Promise<string>`

**Example:**
```typescript
const versionId = await snapshotFrame(frameId);
```



#### `rollbackFrame()`

Rollback a frame to a previous version.

**Parameters:**

- `versionId`: `string` - The version ID to rollback to

**Returns:** `Promise<void>`

**Example:**
```typescript
await rollbackFrame(versionId);
```



#### `trackView()`

Track a view on a frame (for analytics).

**Parameters:**

- `frameId`: `string` - The frame ID

**Returns:** `Promise<void>`

**Example:**
```typescript
await trackView(frameId);
```



#### `trackConversion()`

Track a conversion on a frame (for analytics).

**Parameters:**

- `frameId`: `string` - The frame ID

**Returns:** `Promise<void>`

**Example:**
```typescript
await trackConversion(frameId);
```



### ads

Ads KSA - Knowledge, Skills, and Abilities Search and analyze advertising data from Meta Ad Library and Google Ads Transparency. Provides access to competitor ad creative, copy, and targeting data.

```typescript
import { searchMetaCompanies, getMetaAdsByPageId, searchMetaAds, searchGoogleAds, searchAllAds } from './ksa/ads';
```

#### `searchMetaCompanies()`

Search for companies/pages in the Meta Ad Library.

**Parameters:**

- `query`: `string` - Brand or company name to search

**Returns:** `Promise<MetaCompany[]>`

**Example:**
```typescript
const companies = await searchMetaCompanies('Liquid Death');
console.log(companies[0].name, companies[0].pageId);
```



#### `getMetaAdsByPageId()`

Get all ads for a specific Meta/Facebook page.

**Parameters:**

- `pageId`: `string` - Facebook Page ID (from searchMetaCompanies)

- `options`: `{
    status?: "active" | "inactive" | "all";
    maxAds?: number;
  }` (optional) - Optional filters

**Returns:** `Promise<MetaAd[]>`

**Example:**
```typescript
const companies = await searchMetaCompanies('Liquid Death');
const ads = await getMetaAdsByPageId(companies[0].pageId);
console.log(`Found ${ads.length} ads`);
```



#### `searchMetaAds()`

Search for Meta ads by brand name (convenience function). Combines searchMetaCompanies + getMetaAdsByPageId.

**Parameters:**

- `brandName`: `string` - Brand or company name

- `options`: `{
    status?: "active" | "inactive" | "all";
    maxAds?: number;
  }` (optional) - Optional filters

**Returns:** `Promise<AdSearchResult>`

**Example:**
```typescript
const result = await searchMetaAds('Liquid Death');
console.log(`${result.company?.name}: ${result.ads.length} ads`);
for (const ad of result.ads.slice(0, 5)) {
  console.log(`- ${ad.body?.substring(0, 100)}...`);
}
```



#### `searchGoogleAds()`

Search for Google ads by domain.

**Parameters:**

- `domain`: `string` - Advertiser domain (e.g., 'liquiddeath.com')

- `options`: `{
    region?: string;
    maxAds?: number;
  }` (optional) - Optional filters

**Returns:** `Promise<GoogleAdSearchResult>`

**Example:**
```typescript
const result = await searchGoogleAds('liquiddeath.com');
console.log(`Found ${result.ads.length} Google ads`);
```



#### `searchAllAds()`

Search for ads across both Meta and Google platforms.

**Parameters:**

- `brandName`: `string` - Brand name for Meta search

- `domain`: `string` (optional) - Domain for Google search (optional, derived from brand if not provided)

- `options`: `{
    maxAds?: number;
    metaOnly?: boolean;
    googleOnly?: boolean;
  }` (optional) - Search options

**Returns:** `Promise<{
  meta: AdSearchResult;
  google: GoogleAdSearchResult;
}>`

**Example:**
```typescript
const { meta, google } = await searchAllAds('Liquid Death', 'liquiddeath.com');
console.log(`Meta: ${meta.ads.length} ads, Google: ${google.ads.length} ads`);
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



## Deliverables KSAs (Output Formats)

### pdf

PDF Skills Functions for generating PDF documents from markdown. PDFs are automatically uploaded to cloud storage after generation.

```typescript
import { generate } from './ksa/pdf';
```

#### `generate()`

Generate a PDF from markdown content. The PDF is: 1. Generated locally using the generate-pdf CLI 2. Automatically uploaded to cloud storage (thread or card artifacts)

**Parameters:**

- `params`: `GenerateParams` - Object with filename, content, and optional title

**Returns:** `Promise<PdfResult>`

**Example:**
```typescript
const result = await generate({
  filename: 'competitive-analysis',
  content: '# Competitive Analysis\n\n## Overview\n...',
  title: 'Competitive Analysis Report'
});

if (result.success) {
  console.log(`PDF uploaded: ${result.name} (${result.artifactId})`);
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


