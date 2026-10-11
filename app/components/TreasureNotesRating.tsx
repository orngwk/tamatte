"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Note = { id: string; content: string; created_at: string }
type Props = { treasureId: string; mode: "rating" | "notes" }

const ratingColors: Record<number, string> = {
  1: "#3787E8",
  2: "#32A875",
  3: "#E8C52F",
  4: "#E879B0",
  5: "#E94B4B",
}

export default function TreasureNotesRating({ treasureId, mode }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [rating, setRating] = useState(0)
  const [noteText, setNoteText] = useState("")
  const [open, setOpen] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [savingRating, setSavingRating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      if (!user) { setUserId(null); return }
      setUserId(user.id)
      const [{ data: noteData, error: noteError }, { data: ratingData, error: ratingError }] = await Promise.all([
        supabase.from("treasure_notes").select("id, content, created_at").eq("treasure_id", treasureId).eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("treasure_ratings").select("rating").eq("treasure_id", treasureId).eq("user_id", user.id).maybeSingle(),
      ])
      if (!active) return
      if (noteError || ratingError) {
        console.error("メモ・評価の読み込みに失敗しました", noteError ?? ratingError)
        setError("メモ・評価を読み込めません。データベース設定を確認してください。")
        return
      }
      setNotes(noteData ?? [])
      setRating(ratingData?.rating ?? 0)
    }
    void load()
    return () => { active = false }
  }, [treasureId])

  async function saveRating(value: number) {
    if (!userId || savingRating) return
    const previous = rating
    setRating(value)
    setSavingRating(true)
    setError("")
    const { error: upsertError } = await supabase.from("treasure_ratings").upsert(
      { treasure_id: treasureId, user_id: userId, rating: value },
      { onConflict: "treasure_id,user_id" },
    )
    if (upsertError) { console.error(upsertError); setRating(previous); setError("評価を保存できませんでした。") }
    setSavingRating(false)
  }

  async function addNote() {
    const content = noteText.trim()
    if (!content || !userId || savingNote) return
    setSavingNote(true); setError("")
    const { data, error: insertError } = await supabase.from("treasure_notes")
      .insert({ treasure_id: treasureId, user_id: userId, content })
      .select("id, content, created_at").single()
    if (insertError) { console.error(insertError); setError("メモを保存できませんでした。") }
    else if (data) { setNotes((current) => [...current, data]); setNoteText("") }
    setSavingNote(false)
  }

  function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
  }

  if (mode === "rating") return (
    <span className="inline-flex items-center gap-0.5 text-sm" aria-label={rating > 0 ? `評価 ${rating}つ星` : "評価なし"}>
      {rating > 0 ? Array.from({ length: rating }, (_, index) => <span key={index} className="text-amber-400">★</span>) : null}
    </span>
  )

  return (
    <div className="contents">
      <button type="button" onClick={() => setOpen((value) => !value)} title="メモ" aria-label="メモ"
        className={`flex h-9 w-9 items-center justify-center rounded-full transition sm:h-10 sm:w-10 ${open ? "bg-orange-50 text-orange-500" : "text-gray-400 hover:bg-orange-50 hover:text-orange-500"}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></svg>
        {notes.length > 0 && <span className="ml-0.5 text-xs font-bold text-gray-500">{notes.length}</span>}
      </button>
      {open && (
        <section className="mt-3 basis-full w-full min-w-0 rounded-2xl border border-orange-100 bg-[#fffaf5] p-3 sm:p-4">
          {!userId ? <p className="text-sm text-gray-500">メモを使うにはログインしてください。</p> : <>
            <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor={`note-${treasureId}`}>ひとことメモ</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <textarea id={`note-${treasureId}`} value={noteText} onChange={(event) => setNoteText(event.target.value)} maxLength={200} rows={3} placeholder="あとで見返すためのメモ" className="w-full min-h-[6rem] resize-y rounded-xl border border-orange-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-300" />
              <button type="button" onClick={() => void addNote()} disabled={!noteText.trim() || savingNote} className="rounded-xl bg-orange-400 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-50">{savingNote ? "保存中…" : "メモを保存"}</button>
            </div>
            {notes.length > 0 ? <ul className="mt-4 space-y-3">{notes.map((note) => <li key={note.id} className="rounded-xl bg-white p-3"><p className="break-words text-sm text-gray-700">{note.content}</p><time className="mt-2 block text-xs text-gray-400">{formatDateTime(note.created_at)}</time></li>)}</ul> : <p className="mt-3 text-sm text-gray-400">まだメモはありません。</p>}
          </>}
          {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
        </section>
      )}
    </div>
  )
}
