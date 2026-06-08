const URL_REGEX = /(https?:\/\/[^\s)]+(?:\.[^\s)]+)+[^\s)]*)/gi;
const previewCache = new Map<string, Promise<LinkPreviewData | null>>();

export interface LinkPreviewData {
  title: string;
  description: string;
  url: string;
}

export function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  if (!match?.length) return null;

  const raw = match[0].replace(/[.,!?;:]+$/, "");
  try {
    const parsed = new URL(raw);
    return parsed.toString();
  } catch {
    return raw;
  }
}

export async function fetchLinkPreview(url: string): Promise<LinkPreviewData | null> {
  const normalized = url.trim().replace(/[.,!?;:]+$/, "");
  if (previewCache.has(normalized)) return previewCache.get(normalized)!;

  const target = `https://r.jina.ai/${encodeURI(normalized)}`;
  const promise = (async () => {
    try {
    const res = await fetch(target, {
      headers: { Accept: "text/plain" },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const text = await res.text();
    const title = text.match(/^Title:\s*(.+)$/m)?.[1]?.trim();
    const source = text.match(/^URL Source:\s*(.+)$/m)?.[1]?.trim();
    const markdown = text.match(/Markdown Content:\s*([\s\S]*?)(?:\n\nWarning:|$)/m)?.[1]?.trim();

    const description = markdown
      ?.replace(/\[(.+?)\]\([^)]*\)/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\n+/g, " ")
      .trim();

      return {
        title: title || source || normalized,
        description: description || "Open this link to view more details.",
        url: source || normalized,
      };
    } catch {
      return null;
    }
  })();

  previewCache.set(normalized, promise);
  return promise;
}
