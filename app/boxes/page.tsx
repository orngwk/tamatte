"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import SiteMenu from "@/app/components/SiteMenu"

type TreasureBox = {
  id: string
  name: string
  description: string | null
  username: string | null
  is_public: boolean
  visibility: "public" | "private" | "friends" | null
  created_at: string
}

function VisibilityIcon({
  visibility,
}: {
  visibility: TreasureBox["visibility"]
}) {
  const iconName =
    visibility === "private"
      ? "key"
      : visibility === "friends"
        ? "diamond"
        : "world"

  return (
    <span
      aria-label={
        visibility === "private"
          ? "非公開"
          : visibility === "friends"
            ? "秘密"
            : "公開"
      }
      title={
        visibility === "private"
          ? "非公開"
          : visibility === "friends"
            ? "秘密"
            : "公開"
      }
      style={{
        width: 20,
        height: 20,
        display: "inline-block",
        backgroundColor: "#92C3E5",
        WebkitMaskImage: `url("/icons/${iconName}.svg")`,
        maskImage: `url("/icons/${iconName}.svg")`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  )
}

function PlusIcon() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 46,
        height: 46,
        display: "inline-block",
        backgroundColor: "#FFb770",
        WebkitMaskImage: 'url("/icons/plus2.svg")',
        maskImage: 'url("/icons/plus2.svg")',
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        position: "relative",
        top: -3,
      }}
    />
  )
}

export default function BoxesPage() {
  const [myBoxes, setMyBoxes] = useState<TreasureBox[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      let username: string | null = null

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) {
          console.error("ユーザー情報の取得に失敗:", profileError)
        }

        username = profile?.username?.trim().toLowerCase() ?? null
      }

      if (!username) {
        setMyBoxes([])
        setLoading(false)
        return
      }

      // ----------------------------
      // じぶんの宝箱
      // ----------------------------
      const { data: myBoxData, error: myBoxError } = await supabase
        .from("treasure_boxes")
        .select("*")
        .eq("username", username)
        .order("created_at", { ascending: false })

      if (myBoxError) {
        console.error("自分の宝箱の取得に失敗:", myBoxError)
        setMyBoxes([])
      } else {
        setMyBoxes(myBoxData ?? [])
      }

      setLoading(false)
    }

    loadData()
  }, [])

  function BoxCard({ box }: { box: TreasureBox }) {
    return (
      <div className="relative rounded-3xl border border-orange-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
        <a
          href={`/treasures?box=${encodeURIComponent(box.id)}`}
          aria-label={`${box.name}に宝物を追加`}
          title="この宝箱に宝物を追加"
          className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center transition hover:bg-orange-50"
        >
          <PlusIcon />
        </a>

        <a href={`/boxes/${box.id}`} className="block pr-12">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold">{box.name}</h2>
            <VisibilityIcon visibility={box.visibility} />
          </div>
        </a>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] px-4 py-12 pb-28 text-gray-800 sm:pb-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex justify-end">
          <SiteMenu />
        </div>

        <div className="mt-6 flex justify-start">
          <a href="/create" className="inline-flex items-center justify-center rounded-full bg-[#FFb770] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#f5a45c]">
            宝箱追加
          </a>
        </div>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">🎁</div>
            <p className="mt-4 text-gray-500">宝箱を読み込み中...</p>
          </div>
        ) : (
          <section className="mt-10">
            {myBoxes.length === 0 ? (
              <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
                <p className="mt-4 font-bold">まだ宝箱がありません。</p>
                <p className="mt-2 text-sm text-gray-500">
                  新しい宝箱をつくると、ここに表示されます。
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {myBoxes.map((box) => (
                  <BoxCard key={box.id} box={box} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}