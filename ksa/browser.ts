/**
 * Browser KSA - Browser automation functions
 *
 * Provides headless browser control for screenshots, navigation, and interaction.
 * Functions return simple values (strings) directly for easy use by agents.
 *
 * @example
 * import { open, getText, screenshot } from './ksa/browser';
 *
 * const title = await open('https://example.com');
 * const text = await getText();
 * const path = await screenshot('my-screenshot');
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";

const execAsync = promisify(exec);

/**
 * Open a URL in the browser
 *
 * @param url - The URL to open
 * @returns The page title
 * @throws Error if the page cannot be opened
 *
 * @example
 * const title = await open('https://example.com');
 * console.log('Page title:', title);
 */
export async function open(url: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`agent-browser open "${url}"`, {
      timeout: 30_000,
    });
    const result = JSON.parse(stdout);
    return result.title || "";
  } catch (error) {
    throw new Error(`Failed to open ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Take a screenshot of the current page
 *
 * @param name - Name for the screenshot file (without extension)
 * @returns The path to the saved screenshot
 * @throws Error if screenshot fails
 *
 * @example
 * await open('https://example.com');
 * const path = await screenshot('my-screenshot');
 * console.log('Screenshot saved to:', path);
 */
export async function screenshot(name = "screenshot"): Promise<string> {
  const screenshotPath = `/home/user/artifacts/${name}.png`;
  try {
    await execAsync(`agent-browser screenshot "${screenshotPath}"`, {
      timeout: 10_000,
    });
    return screenshotPath;
  } catch (error) {
    throw new Error(`Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Click an element by CSS selector
 *
 * @param selector - CSS selector of the element to click
 * @throws Error if element not found or click fails
 *
 * @example
 * await click('button.submit');
 */
export async function click(selector: string): Promise<void> {
  try {
    await execAsync(`agent-browser click "${selector}"`, { timeout: 10_000 });
  } catch (error) {
    throw new Error(`Failed to click ${selector}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Type text into an element
 *
 * @param selector - CSS selector of the input element
 * @param text - Text to type
 * @throws Error if element not found or typing fails
 *
 * @example
 * await type('input[name="email"]', 'user@example.com');
 */
export async function type(selector: string, text: string): Promise<void> {
  try {
    await execAsync(`agent-browser type "${selector}" "${text}"`, {
      timeout: 10_000,
    });
  } catch (error) {
    throw new Error(`Failed to type into ${selector}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get the HTML content of the current page
 *
 * @returns The page HTML as a string
 * @throws Error if HTML retrieval fails
 *
 * @example
 * const html = await getHtml();
 * console.log('Page HTML length:', html.length);
 */
export async function getHtml(): Promise<string> {
  try {
    const { stdout } = await execAsync("agent-browser html", {
      timeout: 10_000,
    });
    return stdout;
  } catch (error) {
    throw new Error(`Failed to get HTML: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get the text content of the current page
 *
 * @returns The page text content as a string
 * @throws Error if text retrieval fails
 *
 * @example
 * const text = await getText();
 * console.log('Page text:', text.substring(0, 100));
 */
export async function getText(): Promise<string> {
  try {
    const { stdout } = await execAsync("agent-browser text", {
      timeout: 10_000,
    });
    return stdout;
  } catch (error) {
    throw new Error(`Failed to get text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Close the browser
 *
 * @throws Error if browser close fails
 *
 * @example
 * await closeBrowser();
 */
export async function closeBrowser(): Promise<void> {
  try {
    await execAsync("agent-browser close", { timeout: 5_000 });
  } catch (error) {
    throw new Error(`Failed to close browser: ${error instanceof Error ? error.message : String(error)}`);
  }
}
