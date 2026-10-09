"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import SiteMenu from "@/app/components/SiteMenu"
import { supabase } from "@/lib/supabase"

type CalendarTreasure = {
  id: string
  title: string
  url: string | null
  thumbnail_url: string | null
  box_id: string
  box_name: string
  created_at: string
}

function dateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export default function CalendarPage() {
  const [treasures, setTreasures] = useState<CalendarTreasure[]>([])
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadTreasures() {
      setLoading(true)
      setErrorMessage("")
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setTreasures([])
        setLoading(false)
        setErrorMessage("カレンダーを見るにはログインしてください")
        return
      }
      const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle()
      const username = profile?.username?.trim().toLowerCase()
      if (!username) {
        setTreasures([])
        setLoading(false)
        setErrorMessage("ユーザー情報を取得できませんでした")
        return
      }
      const { data: boxData, error: boxError } = await supabase.from("treasure_boxes").select("id, name").eq("username", username)
      if (boxError) {
        console.error(boxError)
        setErrorMessage("宝箱を読み込めませんでした")
        setLoading(false)
        return
      }
      const boxes = boxData ?? []
      if (boxes.length === 0) {
        setTreasures([])
        setLoading(false)
        return
      }
      const boxNames = new Map(boxes.map((box) => [box.id, box.name]))
      const { data: itemData, error: itemError } = await supabase
        .from("treasure_box_items")
        .select("box_id, treasure_id, created_at, treasures(id, title, url, thumbnail_url)")
        .in("box_id", boxes.map((box) => box.id))
        .order("created_at", { ascending: false })
      if (itemError) {
        console.error(itemError)
        setErrorMessage("登録した宝物を読み込めませんでした")
        setLoading(false)
        return
      }
      const rows: CalendarTreasure[] = (itemData ?? []).flatMap((row: any) => {
        const treasure = Array.isArray(row.treasures) ? row.treasures[0] : row.treasures
        if (!treasure || !row.created_at) return []
        return [{ id: treasure.id, title: treasure.title, url: treasure.url ?? null, thumbnail_url: treasure.thumbnail_url ?? null, box_id: row.box_id, box_name: boxNames.get(row.box_id) ?? "宝箱", created_at: row.created_at }]
      })
      setTreasures(rows)
      setLoading(false)
    }
    loadTreasures()
  }, [])

  const markedDates = useMemo(() => new Set(treasures.map((item) => dateKey(item.created_at))), [treasures])
  const days = useMemo(() => {
    const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return [...Array(firstWeekday).fill(null), ...Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))]
  }, [month])
  const selectedTreasures = treasures.filter((item) => dateKey(item.created_at) === selectedDate)

  return (
    <main className="min-h-screen bg-[#fffaf0] px-4 py-8 pb-24 text-gray-800 sm:px-6 sm:py-10 sm:pb-12">
      <div className="mx-auto max-w-3xl">
        <SiteMenu />
        <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" aria-label="前の月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-full border border-orange-200 px-4 py-2 text-orange-500">‹</button>
            <h2 className="text-lg font-bold">{month.getFullYear()}年{month.getMonth() + 1}月</h2>
            <button type="button" aria-label="次の月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-full border border-orange-200 px-4 py-2 text-orange-500">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-500">
            { ["日", "月", "火", "水", "木", "金", "土"].map((day) => <div key={day} className="py-2">{day}</div>) }
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (!day) return <div key={`blank-${index}`} className="min-h-14" />
              const key = dateKey(day)
              const marked = markedDates.has(key)
              const selected = selectedDate === key
              return <button key={key} type="button" onClick={() => setSelectedDate(key)} className={`flex min-h-14 flex-col items-center justify-center rounded-xl border text-sm transition ${selected ? "border-[#ffad63] bg-[#fff0dc] font-bold" : "border-transparent hover:border-orange-200 hover:bg-orange-50"}`}>
                <span>{day.getDate()}</span>
                <span className={`mt-0.5 h-4 text-sm font-bold ${marked ? "text-[#f29a45]" : "text-transparent"}`}>{marked ? "✦" : "·"}</span>
              </button>
            })}
          </div>
        </section>
        <section className="mt-6">
          {loading ? <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-gray-500">読み込み中...</p> : errorMessage ? <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-gray-500">{errorMessage}</p> : selectedTreasures.length === 0 ? <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-gray-500">この日に登録された宝物はありません。</p> : <div className="mt-4 space-y-3">
            {selectedTreasures.map((item, index) => <Link key={`${item.id}-${item.box_id}-${index}`} href={`/boxes/${item.box_id}`} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
              {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" className="h-20 w-20 shrink-0 rounded-xl object-contain bg-white" /> : null}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400">{item.box_name}・{new Date(item.created_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</p>
                <p className="mt-1 font-bold">{item.title}</p>
              </div>
            </Link>)}
          </div>}
        </section>
      </div>
    </main>
  )
}
