import { NextResponse } from "next/server"

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .trim()
}

function extractMetaContent(html: string, property: string): string | null {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || []

  for (const tag of metaTags) {
    const propertyMatch = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)
    const contentMatch = tag.match(/content\s*=\s*["']([^"']*)["']/i)

    if (
      propertyMatch?.[1]?.toLowerCase() === property.toLowerCase() &&
      contentMatch?.[1]
    ) {
      return decodeHtmlEntities(contentMatch[1])
    }
  }

  return null
}

function extractTitle(html: string): string | null {
  const ogTitle = extractMetaContent(html, "og:title")
  if (ogTitle) return ogTitle

  const twitterTitle = extractMetaContent(html, "twitter:title")
  if (twitterTitle) return twitterTitle

  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)
  if (titleMatch?.[1]) {
    return decodeHtmlEntities(titleMatch[1].replace(/<[^>]*>/g, ""))
  }

  return null
}

function getYouTubeVideoId(url: URL): string | null {
  const hostname = url.hostname.toLowerCase()
  let videoId: string | null = null

  if (hostname === "youtu.be" || hostname === "www.youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null
  } else if (
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com")
  ) {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v")
    } else {
      const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)
      videoId = match?.[1] ?? null
    }
  }

  return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? videoId : null
}

function cleanTitle(title: string, hostname: string): string | null {
  let result = decodeHtmlEntities(title).replace(/\s+/g, " ").trim()
  const host = hostname.toLowerCase()

  if (host === "cmoa.jp" || host.endsWith(".cmoa.jp")) {
    result = result.split(/[｜|]/)[0].trim()
  }

  if (
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtu.be"
  ) {
    result = result.replace(/\s*-\s*YouTube\s*$/i, "").trim()
  }

  return result || null
}

function isUnsafeHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "")

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    return true
  }

  if (
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.")
  ) {
    return true
  }

  const parts = host.split(".")
  if (parts.length === 4) {
    const first = Number(parts[0])
    const second = Number(parts[1])
    if (first === 172 && second >= 16 && second <= 31) {
      return true
    }
  }

  return false
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const targetUrl = typeof body?.url === "string" ? body.url.trim() : ""

    if (!targetUrl) {
      return NextResponse.json({ title: null }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(targetUrl)
    } catch {
      return NextResponse.json({ title: null }, { status: 400 })
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json({ title: null }, { status: 400 })
    }

    if (isUnsafeHostname(parsedUrl.hostname)) {
      return NextResponse.json({ title: null }, { status: 400 })
    }

    const videoId = getYouTubeVideoId(parsedUrl)
    if (videoId) {
      try {
        const oEmbedUrl = new URL("https://www.youtube.com/oembed")
        oEmbedUrl.searchParams.set("url", `https://www.youtube.com/watch?v=${videoId}`)
        oEmbedUrl.searchParams.set("format", "json")

        const youtubeResponse = await fetch(oEmbedUrl.toString(), {
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        })

        if (youtubeResponse.ok) {
          const data = await youtubeResponse.json()
          if (typeof data?.title === "string" && data.title.trim()) {
            return NextResponse.json({
              title: cleanTitle(data.title, "www.youtube.com"),
            })
          }
        }
      } catch (error) {
        console.error("YouTubeタイトル取得エラー:", error)
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    try {
      const response = await fetch(parsedUrl.toString(), {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; tamatte/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        signal: controller.signal,
        cache: "no-store",
      })

      if (!response.ok) {
        return NextResponse.json({ title: null })
      }

      const contentType = response.headers.get("content-type") || ""
      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml")
      ) {
        return NextResponse.json({ title: null })
      }

      const html = await response.text()
      const title = extractTitle(html)

      return NextResponse.json({
        title: title ? cleanTitle(title, parsedUrl.hostname) : null,
      })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    console.error("ページタイトル取得エラー:", error)
    return NextResponse.json({ title: null })
  }
}
