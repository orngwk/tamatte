import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const url = String(body.url ?? "").trim()

    if (!url) {
      return NextResponse.json(
        { thumbnailUrl: null },
        { status: 200 }
      )
    }

    let parsedUrl: URL

    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { thumbnailUrl: null },
        { status: 200 }
      )
    }

    if (
      parsedUrl.protocol !== "http:" &&
      parsedUrl.protocol !== "https:"
    ) {
      return NextResponse.json(
        { thumbnailUrl: null },
        { status: 200 }
      )
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TreasureBox/1.0)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { thumbnailUrl: null },
        { status: 200 }
      )
    }

    const contentType =
      response.headers.get("content-type") ?? ""

    if (!contentType.includes("text/html")) {
      return NextResponse.json(
        { thumbnailUrl: null },
        { status: 200 }
      )
    }

    const html = await response.text()

    const ogImageMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
    )

    const ogImageMatchReverse = html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i
    )

    const twitterImageMatch = html.match(
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
    )

    const twitterImageMatchReverse = html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i
    )

    const imageUrl =
      ogImageMatch?.[1] ??
      ogImageMatchReverse?.[1] ??
      twitterImageMatch?.[1] ??
      twitterImageMatchReverse?.[1] ??
      null

    if (!imageUrl) {
      return NextResponse.json(
        { thumbnailUrl: null },
        { status: 200 }
      )
    }

    const thumbnailUrl = new URL(
      imageUrl,
      parsedUrl
    ).toString()

    return NextResponse.json({
      thumbnailUrl,
    })
  } catch (error) {
    console.error("thumbnail fetch error:", error)

    return NextResponse.json(
      { thumbnailUrl: null },
      { status: 200 }
    )
  }
}