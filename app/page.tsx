"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import SiteMenu from "@/app/components/SiteMenu"

type TreasureBox = {
  id: string
  name: string
  description: string | null
  is_public: boolean
  created_at: string
}

export default function Home() {
  const [boxes, setBoxes] = useState<TreasureBox[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadBoxes() {
      const { data, error } = await supabase
        .from("treasure_boxes")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(3)

      if (error) {
        console.error("宝箱の取得に失敗:", error)
        setLoading(false)
        return
      }

      setBoxes(data ?? [])
      setLoading(false)
    }

    loadBoxes()
  }, [])

  return (
    <main className="min-h-screen bg-[#fffaf0] text-gray-800">
      <header className="px-5 py-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-end">
          <SiteMenu />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
        <div className="rounded-[2rem] bg-white p-7 shadow-sm sm:p-10 lg:p-14">
          <div className="text-center">
            <p className="text-sm font-bold tracking-[0.25em] text-orange-400">
              HOW IT WORKS
            </p>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              宝箱の使い方
            </h2>
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-3">
            <Step
              number="01"
              icon="/icons/treasure.svg"
              title="宝箱をつくる"
              description="好きなテーマで、自分だけの宝箱をつくります。"
            />

            <Step
              number="02"
              icon="/icons/diamond.svg"
              title="宝物をしまう"
              description="動画や記事、食べたいものなどを宝箱に集めます。"
            />

            <Step
              number="03"
              icon="/icons/world.svg"
              title="みんなと共有"
              description="公開範囲を選んで、大切な宝箱をみんなと共有できます。"
            />
          </div>
        </div>

        <div className="mt-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Icon
                  src="/icons/world.svg"
                  className="h-7 w-7 bg-orange-400"
                />

                <p className="text-sm font-bold tracking-[0.2em] text-orange-400">
                  PUBLIC TREASURE BOXES
                </p>
              </div>

              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
                公開されている宝箱
              </h2>

              <p className="mt-3 text-gray-500">
                みんなが集めている「好き」をのぞいてみよう。
              </p>
            </div>

            <a
              href="/boxes"
              className="font-bold text-orange-400 hover:text-orange-500"
            >
              すべて見る →
            </a>
          </div>

          {loading ? (
            <div className="mt-8 rounded-[2rem] bg-white p-10 text-center shadow-sm">
              <p className="text-gray-500">
                宝箱を読み込み中...
              </p>
            </div>
          ) : boxes.length === 0 ? (
            <div className="mt-8 rounded-[2rem] bg-white p-10 text-center shadow-sm">
              <Icon
                src="/icons/treasure.svg"
                className="mx-auto h-14 w-14 bg-orange-300"
              />

              <p className="mt-4 font-bold">
                まだ公開されている宝箱がありません。
              </p>

              <a
                href="/create"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-orange-400 px-6 py-3 font-bold text-white transition hover:bg-orange-500"
              >
                最初の宝箱をつくる
                <span className="text-lg leading-none">＋</span>
              </a>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {boxes.map((box) => (
                <a
                  key={box.id}
                  href={`/boxes/${box.id}`}
                  className="block rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <h3 className="text-xl font-bold">
                    {box.name}
                  </h3>

                  <p className="mt-2 min-h-12 text-sm leading-6 text-gray-500">
                    {box.description || "説明はありません"}
                  </p>

                  <p className="mt-5 flex items-center gap-2 text-sm font-bold text-orange-400">
                    <Icon
                      src="/icons/world.svg"
                      className="h-4 w-4 bg-orange-400"
                    />
                    公開中
                    <span>→</span>
                  </p>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function Icon({
  src,
  className,
}: {
  src: string
  className: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 ${className}`}
      style={{
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  )
}

function Step({
  number,
  icon,
  title,
  description,
}: {
  number: string
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <p className="text-sm font-bold tracking-widest text-orange-300">
        {number}
      </p>

      <div className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full border border-orange-200 bg-orange-50">
        <Icon
          src={icon}
          className="h-10 w-10 bg-orange-400"
        />
      </div>

      <h3 className="mt-5 text-xl font-bold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {description}
      </p>
    </div>
  )
}