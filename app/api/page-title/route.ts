import { NextResponse } from "next/server"

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .trim()
}

function extractMetaContent(
  html: string,
  property: string
) {
  const escaped = property.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  )

  const patterns = [
    new RegExp(
      `<meta\\b[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta\\b[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["'][^>]*>`,
      "i"
    ),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)

    if (match?.[1]) {
      return decodeHtmlEntities(match[1])
    }
  }

  return null
}

function extractTitle(html: string) {
  const ogTitle = extractMetaContent(
    html,
    "og:title"
  )

  if (ogTitle) {
    return ogTitle
  }

  const twitterTitle = extractMetaContent(
    html,
    "twitter:title"
  )

  if (twitterTitle) {
    return twitterTitle
  }

  const titleMatch = html.match(
    /<title\b[^>]*>([\s\S]*?)<\/title>/i
  )

  if (titleMatch?.[1]) {
    return decodeHtmlEntities(
      titleMatch[1].replace(/<[^>]*>/g, "")
    )
  }

  return null
}

/**
 * コミックシーモアのタイトルから、
 * サイト名や宣伝文句を取り除く。
 *
 * 例：
 * うるわしの宵の月（１）｜
 * 無料漫画（マンガ）ならコミックシーモア｜
 * やまもり三香
 *
 * ↓
 * うるわしの宵の月（１）
 */
function cleanTitle(
  title: string,
  hostname: string
) {
  let result = decodeHtmlEntities(title)
    .replace(/\s+/g, " ")
    .trim()

  const host = hostname.toLowerCase()

  if (
    host === "cmoa.jp" ||
    host.endsWith(".cmoa.jp")
  ) {
    // 「｜」または「|」以降のサイト名・宣伝文句を除く
    result = result.split(/[｜|]/)[0].trim()
  }

  return result || null
}

function isUnsafeHostname(hostname: string) {
  const host = hostname
    .toLowerCase()
    .replace(/\.$/, "")

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0"
  ) {
    return true
  }

  if (
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

    if (
      first === 172 &&
      second >= 16 &&
      second <= 31
    ) {
      return true
    }
  }

  return false
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const targetUrl =
      typeof body?.url === "string"
        ? body.url.trim()
        : ""

    if (!targetUrl) {
      return NextResponse.json(
        { title: null },
        { status: 400 }
      )
    }

    let parsedUrl: URL

    try {
      parsedUrl = new URL(targetUrl)
    } catch {
      return NextResponse.json(
        { title: null },
        { status: 400 }
      )
    }

    if (
      parsedUrl.protocol !== "http:" &&
      parsedUrl.protocol !== "https:"
    ) {
      return NextResponse.json(
        { title: null },
        { status: 400 }
      )
    }

    if (isUnsafeHostname(parsedUrl.hostname)) {
      return NextResponse.json(
        { title: null },
        { status: 400 }
      )
    }

    const controller = new AbortController()

    const timeout = setTimeout(() => {
      controller.abort()
    }, 8000)

    try {
      const response = await fetch(
        parsedUrl.toString(),
        {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; TreasureBox/1.0)",
            Accept:
              "text/html,application/xhtml+xml",
          },
          redirect: "follow",
          signal: controller.signal,
          cache: "no-store",
        }
      )

      if (!response.ok) {
        return NextResponse.json({
          title: null,
        })
      }

      const contentType =
        response.headers.get("content-type") || ""

      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml")
      ) {
        return NextResponse.json({
          title: null,
        })
      }

      const html = await response.text()
      const title = extractTitle(html)

      return NextResponse.json({
        title: title
          ? cleanTitle(title, parsedUrl.hostname)
          : null,
      })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    console.error(
      "ページタイトル取得エラー:",
      error
    )

    return NextResponse.json({
      title: null,
    })
  }
}