"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Treasure = {
  id: string
  title: string
  url: string | null
  thumbnail_url: string | null
  description: string | null
  updated_at: string
}
type Note = { id: string; content: string; created_at: string }
type BoxItem = { box_id: string; visibility: "box" | "public" | "private" | "friends" | null }
type Box = { id: string; name: string; is_public: boolean; visibility: "public" | "private" | "friends" | null }

export default function SharedTreasurePage() {
  const params = useParams<{ id: string }>()
  const treasureId = params.id
  const [treasure, setTreasure] = useState<Treasure | null>(null)
  const [box, setBox] = useState<Box | null>(null)
  const [boxId, setBoxId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setMessage("")
      const { data: treasureData, error: treasureError } = await supabase
        .from("treasures")
        .select("id, title, url, thumbnail_url, description, updated_at")
        .eq("id", treasureId)
        .maybeSingle()
      if (!active) return
      if (treasureError || !treasureData) {
        setMessage("この宝物は見つからないか、閲覧できません。")
        setLoading(false)
        return
      }

      const { data: itemData, error: itemError } = await supabase
        .from("treasure_box_items")
        .select("box_id, visibility")
        .eq("treasure_id", treasureId)
        .limit(1)
        .maybeSingle()
      if (!active) return
      if (itemError || !itemData) {
        setMessage("この宝物は現在共有できません。")
        setLoading(false)
        return
      }
      const item = itemData as BoxItem
      const { data: boxData, error: boxError } = await supabase
        .from("treasure_boxes")
        .select("id, name, is_public, visibility")
        .eq("id", item.box_id)
        .maybeSingle()
      if (!active) return
      if (boxError || !boxData) {
        setMessage("この宝物は現在共有できません。")
        setLoading(false)
        return
      }
      const foundBox = boxData as Box
      const publicBox = foundBox.visibility === "public" || (foundBox.visibility == null && foundBox.is_public)
      const publicTreasure = item.visibility === "public" || item.visibility === "box" || item.visibility == null
      if (!publicBox || !publicTreasure) {
        setMessage("この宝物は公開されていません。")
        setLoading(false)
        return
      }
      setTreasure(treasureData as Treasure)
      setBox(foundBox)
      setBoxId(item.box_id)

      // 公開中の宝物に書かれた一言メモを表示します。
      // 匿名ユーザーからも読めるようにするには、同梱SQLのRLSポリシーが必要です。
      const { data: noteData, error: noteError } = await supabase
        .from("treasure_notes")
        .select("id, content, created_at")
        .eq("treasure_id", treasureId)
        .order("created_at", { ascending: false })
      if (!active) return
      if (!noteError) setNotes((noteData ?? []) as Note[])
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [treasureId])

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).format(new Date(value))
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] px-4 py-8 pb-12 text-gray-800">
      <div className="mx-auto max-w-2xl">
        <a href={boxId ? `/boxes/${encodeURIComponent(boxId)}` : "/boxes"} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-gray-700">← 宝物一覧に戻る</a>
        {loading ? (
          <div className="mt-6 rounded-3xl bg-white p-8 text-center text-gray-500 shadow-sm">宝物を読み込み中...</div>
        ) : message ? (
          <div className="mt-6 rounded-3xl bg-white p-8 text-center text-gray-600 shadow-sm">{message}</div>
        ) : treasure ? (
          <>
            <article className="mt-5 overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
              {treasure.thumbnail_url && (
                <div className="bg-orange-50">
                  {treasure.url ? (
                    <a href={treasure.url} target="_blank" rel="noopener noreferrer">
                      <img src={treasure.thumbnail_url} alt="" className="max-h-[420px] w-full object-contain" />
                    </a>
                  ) : (
                    <img src={treasure.thumbnail_url} alt="" className="max-h-[420px] w-full object-contain" />
                  )}
                </div>
              )}
              <div className="p-5 sm:p-7">
                <p className="text-xs font-bold tracking-widest text-[#F2A15B]">TREASURE</p>
                <h1 className="mt-2 break-words text-xl font-bold sm:text-2xl">{treasure.title}</h1>
                <p className="mt-2 text-xs text-gray-400">{box?.name} ・ {formatDate(treasure.updated_at)}</p>
                {treasure.description && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">{treasure.description}</p>}
                {treasure.url && <a href={treasure.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block break-all text-sm text-[#D97722] underline">リンクを開く</a>}
              </div>
            </article>

            <section className="mt-5 rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">一言メモ</h2>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#E58D4A]">{notes.length}件</span>
              </div>
              {notes.length ? (
                <div className="mt-4 divide-y divide-orange-50">
                  {notes.map((note) => (
                    <article key={note.id} className="py-4 first:pt-0 last:pb-0">
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">{note.content}</p>
                      <p className="mt-2 text-xs text-gray-400">{formatDate(note.created_at)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-[#fffaf5] p-4 text-sm leading-6 text-gray-500">まだ一言メモはありません。</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}
