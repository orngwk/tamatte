import { NextResponse } from "next/server"

function getYouTubeVideoId(url: URL): string | null {
  const hostname = url.hostname.toLowerCase()
  let videoId: string | null = null

  if (
    hostname === "youtu.be" ||
    hostname.endsWith(".youtu.be")
  ) {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null
  } else if (
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com")
  ) {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v")
    } else {
      const match = url.pathname.match(
        /^\/(?:shorts|embed|live)\/([^/?]+)/
      )
      videoId = match?.[1] ?? null
    }
  }

  if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
    return null
  }

  return videoId
}

function getMetaImage(html: string): string | null {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? []

  for (const tag of metaTags) {
    const property =
      tag.match(/\bproperty\s*=\s*["']([^"']+)["']/i)?.[1]
        ?.toLowerCase()

    const name =
      tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1]
        ?.toLowerCase()

    const content =
      tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1]

    if (
      content &&
      (
        property === "og:image" ||
        property === "og:image:url" ||
        name === "twitter:image" ||
        name === "twitter:image:src"
      )
    ) {
      return content
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
    }
  }

  return null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const inputUrl = String(body.url ?? "").trim()

    if (!inputUrl) {
      return NextResponse.json({ thumbnailUrl: null })
    }

    let parsedUrl: URL

    try {
      parsedUrl = new URL(inputUrl)
    } catch {
      return NextResponse.json({ thumbnailUrl: null })
    }

    if (
      parsedUrl.protocol !== "http:" &&
      parsedUrl.protocol !== "https:"
    ) {
      return NextResponse.json({ thumbnailUrl: null })
    }

    // YouTubeは動画IDからサムネイルURLを直接取得する
    const videoId = getYouTubeVideoId(parsedUrl)

    if (videoId) {
      return NextResponse.json({
        thumbnailUrl:
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      })
    }

    // YouTube以外のサイトはOGP情報から取得する
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Tamatte/1.0)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return NextResponse.json({ thumbnailUrl: null })
    }

    const contentType =
      response.headers.get("content-type") ?? ""

    if (!contentType.toLowerCase().includes("text/html")) {
      return NextResponse.json({ thumbnailUrl: null })
    }

    const html = await response.text()
    const imageUrl = getMetaImage(html)

    if (!imageUrl) {
      return NextResponse.json({ thumbnailUrl: null })
    }

    const thumbnailUrl = new URL(
      imageUrl,
      parsedUrl
    ).toString()

    if (
      thumbnailUrl.startsWith("http://") ||
      thumbnailUrl.startsWith("https://")
    ) {
      return NextResponse.json({ thumbnailUrl })
    }

    return NextResponse.json({ thumbnailUrl: null })
  } catch (error) {
    console.error("thumbnail fetch error:", error)

    return NextResponse.json({ thumbnailUrl: null })
  }
}