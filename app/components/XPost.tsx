"use client"

import { useEffect } from "react"

type XPostProps = {
  url: string
}

export default function XPost({
  url,
}: XPostProps) {
  useEffect(() => {
    const loadTwitterWidgets = () => {
      const twitter = window as typeof window & {
        twttr?: {
          widgets?: {
            load?: () => void
          }
        }
      }

      twitter.twttr?.widgets?.load?.()
    }

    if (
      document.querySelector(
        'script[src="https://platform.twitter.com/widgets.js"]'
      )
    ) {
      loadTwitterWidgets()
      return
    }

    const script =
      document.createElement("script")

    script.src =
      "https://platform.twitter.com/widgets.js"

    script.async = true

    script.onload = () => {
      loadTwitterWidgets()
    }

    document.body.appendChild(script)
  }, [])

  return (
    <div className="mt-4 overflow-hidden rounded-2xl">
      <blockquote
        className="twitter-tweet"
        data-dnt="true"
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Xの投稿を見る
        </a>
      </blockquote>
    </div>
  )
}