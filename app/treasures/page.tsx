"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import SiteMenu from "@/app/components/SiteMenu"

type TreasureBox = {
  id: string
  name: string
  is_public: boolean
}

type BoxStatus = {
  id: string
  name: string
  color: string
  position: number
}

function TreasuresPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [boxes, setBoxes] = useState<TreasureBox[]>([])
  const [statuses, setStatuses] = useState<BoxStatus[]>([])

  const [boxId, setBoxId] = useState("")
  const [statusId, setStatusId] = useState("")
  const [visibility, setVisibility] = useState("public")

  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [description, setDescription] = useState("")
  const [rating, setRating] = useState(0)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetchingTitle, setFetchingTitle] = useState(false)

  useEffect(() => {
    async function loadBoxes() {
      setLoading(true)

      const { data, error } = await supabase
        .from("treasure_boxes")
        .select("id, name, is_public")
        .order("created_at", { ascending: false })

      if (error) {
        console.error(error)
        setLoading(false)
        return
      }

      const loadedBoxes = data || []

      setBoxes(loadedBoxes)

      const initialBoxId = searchParams.get("box")

      if (initialBoxId) {
        const selectedBox = loadedBoxes.find(
          (box) => box.id === initialBoxId
        )

        if (selectedBox) {
          setBoxId(selectedBox.id)

          setVisibility(
            selectedBox.is_public
              ? "public"
              : "private"
          )

          await loadStatuses(
            selectedBox.id,
            loadedBoxes
          )
        }
      }

      setLoading(false)
    }

    loadBoxes()
  }, [searchParams])

  async function loadStatuses(
    selectedBoxId: string,
    boxList: TreasureBox[]
  ) {
    setStatuses([])
    setStatusId("")

    if (!selectedBoxId) {
      return
    }

    const selectedBox = boxList.find(
      (box) => box.id === selectedBoxId
    )

    if (selectedBox) {
      setVisibility(
        selectedBox.is_public
          ? "public"
          : "private"
      )
    }

    const { data, error } = await supabase
      .from("box_statuses")
      .select("id, name, color, position")
      .eq("box_id", selectedBoxId)
      .order("position", {
        ascending: true,
      })

    if (error) {
      console.error(error)
      return
    }

    const loadedStatuses = data || []

    setStatuses(loadedStatuses)

    if (loadedStatuses.length > 0) {
      setStatusId(loadedStatuses[0].id)
    }
  }

  async function handleBoxChange(
    selectedBoxId: string
  ) {
    setBoxId(selectedBoxId)

    await loadStatuses(
      selectedBoxId,
      boxes
    )
  }

  async function getPageTitle(
    targetUrl: string
  ) {
    if (!targetUrl.trim()) {
      return null
    }

    try {
      const response = await fetch(
        "/api/page-title",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: targetUrl.trim(),
          }),
        }
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()

      return data.title || null
    } catch (error) {
      console.error(
        "ページタイトル取得エラー:",
        error
      )

      return null
    }
  }

  async function getThumbnailUrl(
    targetUrl: string
  ) {
    if (!targetUrl.trim()) {
      return null
    }

    try {
      const response = await fetch(
        "/api/thumbnail",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: targetUrl.trim(),
          }),
        }
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()

      return data.thumbnailUrl || null
    } catch (error) {
      console.error(
        "サムネイル取得エラー:",
        error
      )

      return null
    }
  }

  async function handleUrlBlur() {
    const targetUrl = url.trim()

    if (!targetUrl || title.trim()) {
      return
    }

    setFetchingTitle(true)

    const pageTitle = await getPageTitle(targetUrl)

    if (pageTitle) {
      setTitle(pageTitle)
    }

    setFetchingTitle(false)
  }

  async function addTreasure() {
    if (!boxId) {
      alert("宝箱を選んでください")
      return
    }

    const trimmedUrl = url.trim()
    let treasureTitle = title.trim()

    if (!treasureTitle && trimmedUrl) {
      setSaving(true)

      const pageTitle =
        await getPageTitle(trimmedUrl)

      treasureTitle =
        pageTitle || trimmedUrl
    }

    if (!treasureTitle) {
      alert(
        "宝物の名前を入力するか、URLを入力してください"
      )
      return
    }

    setSaving(true)

    const thumbnailUrl =
      await getThumbnailUrl(trimmedUrl)

    const {
      data: treasure,
      error: treasureError,
    } = await supabase
      .from("treasures")
      .insert({
        title: treasureTitle,
        url: trimmedUrl || null,
        thumbnail_url: thumbnailUrl,
        description:
          description.trim() || null,
      })
      .select("id")
      .single()

    if (treasureError || !treasure) {
      console.error(treasureError)

      alert(
        `宝物の保存に失敗しました：${
          treasureError?.message ||
          "不明なエラー"
        }`
      )

      setSaving(false)
      return
    }

    if (rating > 0) {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id

      if (userId) {
        const { error: ratingError } = await supabase
          .from("treasure_ratings")
          .upsert({
            treasure_id: treasure.id,
            user_id: userId,
            rating,
            updated_at: new Date().toISOString(),
          }, { onConflict: "treasure_id,user_id" })

        if (ratingError) {
          console.error("評価の保存に失敗:", ratingError)
          alert(`評価の保存に失敗しました：${ratingError.message}`)
          setSaving(false)
          return
        }
      }
    }

    const { error: itemError } =
      await supabase
        .from("treasure_box_items")
        .insert({
          box_id: boxId,
          treasure_id: treasure.id,
          position: 0,
          status_id: statusId || null,
          visibility: visibility,
        })

    if (itemError) {
      console.error(itemError)

      alert(
        `宝箱への追加に失敗しました：${itemError.message}`
      )

      setSaving(false)
      return
    }

    setSaving(false)

    alert("宝物を追加しました")

    setTitle("")
    setUrl("")
    setDescription("")
    setRating(0)

    router.push(`/boxes/${boxId}`)
  }

  const selectedStatus = statuses.find(
    (status) => status.id === statusId
  )

  const selectedBox = boxes.find(
    (box) => box.id === boxId
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf0] px-4 py-8 text-gray-800 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-xl">
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="text-5xl">
              
            </div>

            <p className="mt-4 text-sm text-gray-500">
              宝箱を確認しています...
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] px-4 py-8 pb-24 text-gray-800 sm:px-6 sm:py-12 sm:pb-12">
      <div className="mx-auto max-w-xl">
        <SiteMenu />
        <a
          href={
            boxId
              ? `/boxes/${boxId}`
              : "/boxes"
          }
          className="text-sm font-medium text-orange-400 hover:text-orange-500"
        >
          ← 宝箱に戻る
        </a>

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:p-8">
          <div className="space-y-5">
            {/* 宝箱 */}
            <div>
              <select
                value={boxId}
                onChange={(e) =>
                  handleBoxChange(
                    e.target.value
                  )
                }
                className="w-full rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-3 text-sm outline-none focus:border-orange-300"
              >
                <option value="">
                  選択してください
                </option>

                {boxes.map((box) => (
                  <option
                    key={box.id}
                    value={box.id}
                  >
                    {box.name}
                  </option>
                ))}
              </select>

              {selectedBox && (
                <p className="mt-2 text-xs text-gray-400">
                  {selectedBox.is_public
                    ? "公開宝箱"
                    : "非公開宝箱"}
                </p>
              )}
            </div>

            {/* 公開範囲 */}
            <div>
              <select
                value={visibility}
                onChange={(e) =>
                  setVisibility(
                    e.target.value
                  )
                }
                className="w-full rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-3 text-sm outline-none focus:border-orange-300"
              >
                <option value="public">
                  公開
                </option>

                <option value="private">
                  非公開
                </option>

                <option value="friends">
                   秘宝
                </option>
              </select>
            </div>

            {/* ステータス */}
            {statuses.length > 0 && (
              <div>
                <div
                  className="rounded-2xl p-1"
                  style={{
                    backgroundColor:
                      selectedStatus?.color ||
                      "#f3f4f6",
                  }}
                >
                  <select
                    value={statusId}
                    onChange={(e) =>
                      setStatusId(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm font-bold outline-none"
                  >
                    {statuses.map(
                      (status) => (
                        <option
                          key={status.id}
                          value={status.id}
                        >
                          {status.name}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            )}

            {/* 宝物名 */}
            <div>
              <input
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                placeholder="宝物名"
                className="w-full rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-3 text-sm outline-none focus:border-orange-300"
              />
            </div>

            {/* URL */}
            <div>
              <input
                value={url}
                onChange={(e) =>
                  setUrl(e.target.value)
                }
                onBlur={handleUrlBlur}
                placeholder="URL（任意）"
                className="w-full rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-3 text-sm outline-none focus:border-orange-300"
              />

              {fetchingTitle && (
                <p className="mt-2 text-xs text-orange-400">
                  ページタイトルを取得しています...
                </p>
              )}
            </div>

            {/* 評価 */}
            <div>
              <div className="flex items-center gap-2" role="group" aria-label="評価を選択">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value}つ星`}
                    aria-pressed={rating === value}
                    onClick={() => setRating(rating === value ? 0 : value)}
                    className={`text-3xl transition ${rating >= value ? "text-amber-400" : "text-gray-300"}`}
                  >
                    ★
                  </button>
                ))}
                {rating > 0 && (
                  <button type="button" onClick={() => setRating(0)} className="ml-2 text-xs text-gray-400 underline">
                    クリア
                  </button>
                )}
              </div>
            </div>

            {/* 説明 */}
            <div>
              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                placeholder="説明・ひとことメモ"
                rows={3}
                style={{ minHeight: "6.5rem" }}
                className="w-full resize-none rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-3 text-sm leading-6 outline-none focus:border-orange-300"
              />
            </div>

            {/* 保存 */}
            <button
              onClick={addTreasure}
              disabled={saving}
              className="w-full rounded-full bg-orange-400 px-6 py-4 text-sm font-bold text-white shadow-md transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
            >
                        {saving
                ? "タイトル・サムネイルを確認して保存中..."
                : "宝物を追加する"}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function TreasuresPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#fffaf0] px-4 py-8 text-gray-800 sm:px-6 sm:py-12">
          <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">
            <p className="text-sm text-gray-500">宝箱を確認しています...</p>
          </div>
        </main>
      }
    >
      <TreasuresPageContent />
    </Suspense>
  )
}
