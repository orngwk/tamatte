"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import SiteMenu from "@/app/components/SiteMenu"
import XPost from "@/app/components/XPost"
import TreasureNotesRating from "@/app/components/TreasureNotesRating"

type TreasureBox = {
  id: string
  name: string
  username: string | null
  is_public: boolean
  visibility: "public" | "private" | "friends" | null
}

type BoxStatus = {
  id: string
  name: string
  color: string | null
}

type TimelineItem = {
  treasureId: string
  title: string
  url: string | null
  thumbnailUrl: string | null
  description: string | null
  createdAt: string
  updatedAt: string
  timelineOnUpdate: boolean
  boxId: string
  boxName: string
  boxUsername: string | null
  boxVisibility: "public" | "private" | "friends" | null
  visibility: string
  statusId: string | null
  statusName: string | null
  statusColor: string | null
  statuses: BoxStatus[]
}

function isXPostUrl(url: string | null) {
  if (!url) return false

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()

    return (
      (host === "x.com" ||
        host.endsWith(".x.com") ||
        host === "twitter.com" ||
        host.endsWith(".twitter.com")) &&
      parsed.pathname.includes("/status/")
    )
  } catch {
    return false
  }
}

function Icon({
  name,
  size = 20,
}: {
  name: string
  size?: number
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: "inline-block",
        backgroundColor: "currentColor",
        WebkitMaskImage: `url("/icons/${name}.svg")`,
        maskImage: `url("/icons/${name}.svg")`,
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

function Bookmark2Icon({
  active,
}: {
  active: boolean
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 16,
        height: 23,
        display: "inline-block",
        backgroundColor: active
          ? "#FFB770"
          : "#9CA3AF",
        WebkitMaskImage:
          'url("/icons/bookmark2.svg")',
        maskImage:
          'url("/icons/bookmark2.svg")',
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

export default function TimelinePage() {
  const [myUsername, setMyUsername] = useState("")
  const [items, setItems] = useState<TimelineItem[]>([])
  const [timelineMode, setTimelineMode] =
    useState<"mine" | "favorite" | "all">("mine")

  const [favoriteTreasureIds, setFavoriteTreasureIds] =
    useState<string[]>([])

  const [savedTreasureIds, setSavedTreasureIds] =
    useState<string[]>([])

  const [myBoxes, setMyBoxes] =
    useState<TreasureBox[]>([])

  const [selectedTreasureId, setSelectedTreasureId] =
    useState<string | null>(null)

  const [lastSeenAt, setLastSeenAt] =
    useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [updatingStatusId, setUpdatingStatusId] =
    useState<string | null>(null)

  const [editingTreasureId, setEditingTreasureId] =
    useState<string | null>(null)

  const [editTitle, setEditTitle] = useState("")
  const [editRating, setEditRating] = useState(0)
  const [editDescription, setEditDescription] =
    useState("")
  const [editUrl, setEditUrl] = useState("")

  const [editTimelineOnUpdate, setEditTimelineOnUpdate] =
    useState(true)

  const [editVisibility, setEditVisibility] =
    useState<"public" | "private" | "friends">("public")

  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    async function loadLoggedInUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setMyUsername("")
        return
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle()

      if (error) {
        console.error(
          "ログインユーザーの取得に失敗:",
          error
        )
        return
      }

      setMyUsername(
        profile?.username?.trim().toLowerCase() ?? ""
      )
    }

    loadLoggedInUser()
  }, [])

  useEffect(() => {
    async function loadTimeline() {
      setLoading(true)

      const username =
        myUsername.trim().toLowerCase()

      if (!username) {
        setItems([])
        setLoading(false)
        return
      }

      const { data: readData } = await supabase
        .from("timeline_reads")
        .select("last_seen_at")
        .eq("username", username)
        .maybeSingle()

      const previousLastSeen =
        readData?.last_seen_at ?? null

      setLastSeenAt(previousLastSeen)

      const {
        data: myBoxData,
        error: myBoxError,
      } = await supabase
        .from("treasure_boxes")
        .select(
          "id, name, username, is_public, visibility"
        )
        .eq("username", username)
        .order("created_at", {
          ascending: false,
        })

      if (myBoxError) {
        console.error(
          "自分の宝箱の取得に失敗:",
          myBoxError
        )
      }

      const boxes =
        (myBoxData ?? []) as TreasureBox[]

      setMyBoxes(boxes)

      const {
        data: savedData,
        error: savedError,
      } = await supabase
        .from("treasure_saves")
        .select("treasure_id")
        .eq("username", username)

      if (savedError) {
        console.error(
          "保存済み宝物の取得に失敗:",
          savedError
        )
      }

      setSavedTreasureIds(
        savedData?.map(
          (item) => item.treasure_id
        ) ?? []
      )

      let targetBoxIds: string[] = []

      if (timelineMode === "mine") {
        targetBoxIds =
          boxes.map((box) => box.id)
      } else if (timelineMode === "favorite") {
        const {
          data: favoriteData,
          error: favoriteError,
        } = await supabase
          .from("box_favorites")
          .select("box_id")
          .eq("username", username)

        if (favoriteError) {
          console.error(
            "お気に入り宝箱の取得に失敗:",
            favoriteError
          )
        }

        targetBoxIds =
          favoriteData?.map(
            (item) => item.box_id
          ) ?? []
      } else {
        const {
          data: publicBoxData,
          error: publicBoxError,
        } = await supabase
          .from("treasure_boxes")
          .select("id")
          .eq("is_public", true)

        if (publicBoxError) {
          console.error(
            "公開宝箱の取得に失敗:",
            publicBoxError
          )
        }

        const publicBoxIds =
          publicBoxData?.map(
            (box) => box.id
          ) ?? []

        const {
          data: favoriteData,
          error: favoriteError,
        } = await supabase
          .from("box_favorites")
          .select("box_id")
          .eq("username", username)

        if (favoriteError) {
          console.error(
            "お気に入り宝箱の取得に失敗:",
            favoriteError
          )
        }

        const favoriteBoxIds =
          favoriteData?.map(
            (item) => item.box_id
          ) ?? []

        const myBoxIds =
          boxes.map((box) => box.id)

        targetBoxIds =
          publicBoxIds.filter(
            (boxId) =>
              !myBoxIds.includes(boxId) &&
              !favoriteBoxIds.includes(boxId)
          )
      }

      if (targetBoxIds.length === 0) {
        setItems([])
        setFavoriteTreasureIds([])
        setLoading(false)

        const now =
          new Date().toISOString()

        await supabase
          .from("timeline_reads")
          .upsert(
            {
              username,
              last_seen_at: now,
            },
            {
              onConflict: "username",
            }
          )

        return
      }

      const {
        data: boxData,
        error: boxError,
      } = await supabase
        .from("treasure_boxes")
        .select(
          "id, name, username, is_public, visibility"
        )
        .in("id", targetBoxIds)

      if (boxError) {
        console.error(
          "宝箱の取得に失敗:",
          boxError
        )

        setItems([])
        setLoading(false)
        return
      }

      const targetBoxes =
        (boxData ?? []) as TreasureBox[]

      const timelineItems: TimelineItem[] = []

      for (const box of targetBoxes) {
        const isBoxOwner =
          box.username?.trim().toLowerCase() ===
          username

        let isSecretMember = false

        if (!box.is_public && !isBoxOwner) {
          const {
            data: memberData,
            error: memberError,
          } = await supabase
            .from("secret_box_members")
            .select("username")
            .eq("box_id", box.id)
            .eq("username", username)
            .maybeSingle()

          if (memberError) {
            console.error(
              "秘密の宝箱メンバー取得に失敗:",
              memberError
            )
          }

          isSecretMember = Boolean(memberData)
        }

        const canViewBox =
          box.is_public ||
          isBoxOwner ||
          isSecretMember

        if (!canViewBox) continue

        const {
          data: statusData,
          error: statusError,
        } = await supabase
          .from("box_statuses")
          .select("id, name, color")
          .eq("box_id", box.id)
          .order("position", {
            ascending: true,
          })

        if (statusError) {
          console.error(
            "ステータスの取得に失敗:",
            statusError
          )
        }

        const statuses =
          (statusData ?? []) as BoxStatus[]

        const {
          data: itemData,
          error: itemError,
        } = await supabase
          .from("treasure_box_items")
          .select(
            "treasure_id, visibility, status_id"
          )
          .eq("box_id", box.id)

        if (itemError) {
          console.error(
            "宝箱の中身の取得に失敗:",
            itemError
          )
          continue
        }

        const visibleItems =
          (itemData ?? []).filter((item) => {
            const visibility =
              item.visibility || "public"

            if (visibility === "public") {
              return true
            }

            if (visibility === "private") {
              return isBoxOwner
            }

            if (visibility === "friends") {
              return isBoxOwner || isSecretMember
            }

            if (visibility === "box") {
              return canViewBox
            }

            return false
          })

        const treasureIds =
          visibleItems.map(
            (item) => item.treasure_id
          )

        if (treasureIds.length === 0) {
          continue
        }

        const {
          data: treasureData,
          error: treasureError,
        } = await supabase
          .from("treasures")
          .select(
            "id, title, url, thumbnail_url, description, created_at, updated_at, timeline_on_update"
          )
          .in("id", treasureIds)

        if (treasureError) {
          console.error(
            "宝物の取得に失敗:",
            treasureError
          )
          continue
        }

        for (const treasure of treasureData ?? []) {
          const item =
            visibleItems.find(
              (row) =>
                row.treasure_id ===
                treasure.id
            )

          const status =
            statuses.find(
              (row) =>
                row.id === item?.status_id
            ) ?? null

          timelineItems.push({
            treasureId: treasure.id,
            title: treasure.title,
            url: treasure.url,
            thumbnailUrl:
              treasure.thumbnail_url ?? null,
            description:
              treasure.description,
            createdAt: treasure.created_at,
            updatedAt:
              treasure.updated_at ??
              treasure.created_at,
            timelineOnUpdate:
              treasure.timeline_on_update ??
              true,
            boxId: box.id,
            boxName: box.name,
            boxUsername: box.username,
            boxVisibility:
              box.visibility ?? null,
            visibility:
              item?.visibility || "public",
            statusId:
              item?.status_id ?? null,
            statusName:
              status?.name ?? null,
            statusColor:
              status?.color ?? null,
            statuses,
          })
        }
      }

      timelineItems.sort((a, b) => {
        const aTime = a.timelineOnUpdate
          ? a.updatedAt
          : a.createdAt

        const bTime = b.timelineOnUpdate
          ? b.updatedAt
          : b.createdAt

        return (
          new Date(bTime).getTime() -
          new Date(aTime).getTime()
        )
      })

      setItems(timelineItems)

      const allTreasureIds =
        timelineItems.map(
          (item) => item.treasureId
        )

      if (allTreasureIds.length > 0) {
        const {
          data: treasureFavoriteData,
          error: treasureFavoriteError,
        } = await supabase
          .from("treasure_favorites")
          .select("treasure_id")
          .eq("username", username)
          .in(
            "treasure_id",
            allTreasureIds
          )

        if (treasureFavoriteError) {
          console.error(
            "宝物お気に入りの取得に失敗:",
            treasureFavoriteError
          )
        }

        setFavoriteTreasureIds(
          treasureFavoriteData?.map(
            (item) => item.treasure_id
          ) ?? []
        )
      } else {
        setFavoriteTreasureIds([])
      }

      setLoading(false)

      const now =
        new Date().toISOString()

      const { error: saveError } =
        await supabase
          .from("timeline_reads")
          .upsert(
            {
              username,
              last_seen_at: now,
            },
            {
              onConflict: "username",
            }
          )

      if (saveError) {
        console.error(
          "タイムライン確認時刻の保存に失敗:",
          saveError
        )
      }
    }

    loadTimeline()
  }, [myUsername, timelineMode])

  function formatDate(dateString: string) {
    return new Date(
      dateString
    ).toLocaleDateString(
      "ja-JP",
      {
        month: "numeric",
        day: "numeric",
      }
    )
  }

  function isNew(dateString: string) {
    if (!lastSeenAt) return false

    return (
      new Date(dateString).getTime() >
      new Date(lastSeenAt).getTime()
    )
  }

  function getVisibilityIcon(
    visibility: string
  ) {
    if (visibility === "private") {
      return "key"
    }

    if (visibility === "friends") {
      return "diamond"
    }

    return "world"
  }

  function isMyTreasure(
    item: TimelineItem
  ) {
    return (
      item.boxUsername?.toLowerCase() ===
      myUsername.trim().toLowerCase()
    )
  }

  async function updateTreasureStatus(
    item: TimelineItem,
    statusId: string
  ) {
    if (!isMyTreasure(item)) return

    setUpdatingStatusId(
      item.treasureId
    )

    const now =
      new Date().toISOString()

    const { error: itemError } =
      await supabase
        .from("treasure_box_items")
        .update({
          status_id:
            statusId || null,
        })
        .eq("box_id", item.boxId)
        .eq(
          "treasure_id",
          item.treasureId
        )

    if (itemError) {
      console.error(itemError)

      alert(
        `ステータスの変更に失敗しました：${itemError.message}`
      )

      setUpdatingStatusId(null)
      return
    }

    const { error: treasureError } =
      await supabase
        .from("treasures")
        .update({
          updated_at: now,
        })
        .eq(
          "id",
          item.treasureId
        )

    if (treasureError) {
      console.error(treasureError)

      alert(
        `日付の更新に失敗しました：${treasureError.message}`
      )

      setUpdatingStatusId(null)
      return
    }

    const selectedStatus =
      item.statuses.find(
        (status) =>
          status.id === statusId
      ) ?? null

    setItems((current) =>
      current.map((currentItem) =>
        currentItem.treasureId ===
        item.treasureId
          ? {
              ...currentItem,
              statusId:
                selectedStatus?.id ??
                null,
              statusName:
                selectedStatus?.name ??
                null,
              statusColor:
                selectedStatus?.color ??
                null,
              updatedAt: now,
            }
          : currentItem
      )
    )

    setUpdatingStatusId(null)
  }

  async function toggleTreasureFavorite(
    treasureId: string
  ) {
    const username =
      myUsername.trim().toLowerCase()

    if (!username) return

    const isFavorite =
      favoriteTreasureIds.includes(
        treasureId
      )

    if (isFavorite) {
      const { error } =
        await supabase
          .from("treasure_favorites")
          .delete()
          .eq(
            "username",
            username
          )
          .eq(
            "treasure_id",
            treasureId
          )

      if (error) {
        alert(
          `お気に入り解除に失敗しました：${error.message}`
        )
        return
      }

      setFavoriteTreasureIds(
        (current) =>
          current.filter(
            (id) =>
              id !== treasureId
          )
      )
    } else {
      const { error } =
        await supabase
          .from("treasure_favorites")
          .insert({
            username,
            treasure_id:
              treasureId,
          })

      if (error) {
        alert(
          `お気に入り登録に失敗しました：${error.message}`
        )
        return
      }

      setFavoriteTreasureIds(
        (current) => [
          ...current,
          treasureId,
        ]
      )
    }
  }

  async function saveTreasure(
    boxId: string
  ) {
    if (
      !selectedTreasureId ||
      !myUsername
    ) {
      return
    }

    setSaving(true)

    const selectedBox =
      myBoxes.find(
        (box) =>
          box.id === boxId
      )

    const sourceItem =
      items.find(
        (item) =>
          item.treasureId ===
          selectedTreasureId
      )

    if (
      !selectedBox ||
      !sourceItem
    ) {
      setSaving(false)
      return
    }

    const isOtherUsersSecretBox =
      sourceItem.boxVisibility ===
        "friends" &&
      sourceItem.boxUsername
        ?.trim()
        .toLowerCase() !==
        myUsername
          .trim()
          .toLowerCase()

    if (isOtherUsersSecretBox) {
      alert(
        "他の人の秘密の宝箱にある宝物は保存できません。"
      )

      setSaving(false)
      setSelectedTreasureId(null)
      return
    }

    const {
      data: existingSave,
      error: existingSaveError,
    } = await supabase
      .from("treasure_saves")
      .select("id")
      .eq(
        "username",
        myUsername
      )
      .eq(
        "treasure_id",
        selectedTreasureId
      )
      .eq("box_id", boxId)
      .maybeSingle()

    if (existingSaveError) {
      console.error(
        "保存済み確認に失敗:",
        existingSaveError
      )
    }

    if (existingSave) {
      alert(
        "この宝物はすでにその宝箱に保存されています。"
      )

      setSaving(false)
      setSelectedTreasureId(null)
      return
    }

    const savedAt =
      new Date().toISOString()

    const {
      data: copiedTreasure,
      error: treasureError,
    } = await supabase
      .from("treasures")
      .insert({
        title: sourceItem.title,
        url: sourceItem.url,
        thumbnail_url:
          sourceItem.thumbnailUrl,
        description: null,
        created_at: savedAt,
        updated_at: savedAt,
        timeline_on_update:
          false,
      })
      .select("id")
      .single()

    if (
      treasureError ||
      !copiedTreasure
    ) {
      console.error(
        "宝物のコピーに失敗:",
        treasureError
      )

      alert(
        `宝物のコピーに失敗しました：${
          treasureError?.message ??
          "不明なエラー"
        }`
      )

      setSaving(false)
      return
    }

    const targetVisibility =
      selectedBox.visibility ===
      "friends"
        ? "friends"
        : selectedBox.visibility ===
            "private"
          ? "private"
          : "public"

    const { error: itemError } =
      await supabase
        .from("treasure_box_items")
        .insert({
          box_id: boxId,
          treasure_id:
            copiedTreasure.id,
          position: 0,
          visibility:
            targetVisibility,
        })

    if (itemError) {
      console.error(
        "コピーした宝物を宝箱へ追加できませんでした:",
        itemError
      )

      await supabase
        .from("treasures")
        .delete()
        .eq(
          "id",
          copiedTreasure.id
        )

      alert(
        `宝箱への保存に失敗しました：${itemError.message}`
      )

      setSaving(false)
      return
    }

    const {
      error: saveRecordError,
    } = await supabase
      .from("treasure_saves")
      .insert({
        username: myUsername,
        treasure_id:
          selectedTreasureId,
        box_id: boxId,
        copied_treasure_id:
          copiedTreasure.id,
      })

    if (saveRecordError) {
      console.error(
        "保存記録の作成に失敗:",
        saveRecordError
      )

      await supabase
        .from("treasure_box_items")
        .delete()
        .eq(
          "box_id",
          boxId
        )
        .eq(
          "treasure_id",
          copiedTreasure.id
        )

      await supabase
        .from("treasures")
        .delete()
        .eq(
          "id",
          copiedTreasure.id
        )

      alert(
        `保存記録の作成に失敗しました：${saveRecordError.message}`
      )

      setSaving(false)
      return
    }

    setSavedTreasureIds(
      (current) => [
        ...current,
        selectedTreasureId,
      ]
    )

    setSelectedTreasureId(null)
    setSaving(false)

    alert(
      `「${selectedBox.name}」に宝物をコピーして保存しました！🔖`
    )
  }

  function openTreasureEdit(
    item: TimelineItem
  ) {
    setEditingTreasureId(
      item.treasureId
    )

    setEditTitle(item.title)

    setEditRating(0)
    void (async () => {
      const { data: authResult } = await supabase.auth.getUser()
      if (!authResult.user) return
      const { data: ratingRow, error: ratingLoadError } = await supabase
        .from("treasure_ratings")
        .select("rating")
        .eq("treasure_id", item.treasureId)
        .eq("user_id", authResult.user.id)
        .maybeSingle()
      if (ratingLoadError) {
        console.error("タイムライン編集時の評価読み込みに失敗:", ratingLoadError)
        return
      }
      setEditRating(ratingRow?.rating ?? 0)
    })()

    setEditDescription(
      item.description ?? ""
    )

    setEditUrl(item.url ?? "")

    setEditTimelineOnUpdate(
      item.timelineOnUpdate
    )

    setEditVisibility(
      item.visibility === "private"
        ? "private"
        : item.visibility === "friends"
          ? "friends"
          : "public"
    )
  }

  function closeTreasureEdit() {
    if (savingEdit) return

    setEditingTreasureId(null)
    setEditTitle("")
    setEditRating(0)
    setEditDescription("")
    setEditUrl("")
    setEditTimelineOnUpdate(true)
    setEditVisibility("public")
  }

  async function getThumbnailUrl(
    targetUrl: string
  ) {
    if (!targetUrl.trim()) {
      return null
    }

    try {
      const response =
        await fetch(
          "/api/thumbnail",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              url:
                targetUrl.trim(),
            }),
          }
        )

      if (!response.ok) {
        return null
      }

      const data =
        await response.json()

      return (
        data.thumbnailUrl ??
        null
      )
    } catch (error) {
      console.error(
        "サムネイル取得エラー:",
        error
      )

      return null
    }
  }

  async function saveTimelineTreasureEdit() {
    if (
      !editingTreasureId ||
      !editTitle.trim()
    ) {
      alert(
        "タイトルを入力してください"
      )
      return
    }

    const targetItem =
      items.find(
        (item) =>
          item.treasureId ===
          editingTreasureId
      )

    if (!targetItem) return

    setSavingEdit(true)

    const now =
      new Date().toISOString()

    const thumbnailUrl =
      await getThumbnailUrl(
        editUrl
      )

    const {
      error: treasureError,
    } = await supabase
      .from("treasures")
      .update({
        title:
          editTitle.trim(),
        description:
          editDescription.trim() ||
          null,
        url:
          editUrl.trim() ||
          null,
        thumbnail_url:
          thumbnailUrl,
        updated_at: now,
        timeline_on_update:
          editTimelineOnUpdate,
      })
      .eq(
        "id",
        editingTreasureId
      )

    if (treasureError) {
      console.error(
        "タイムライン上の宝物更新に失敗:",
        treasureError
      )

      alert(
        `宝物の更新に失敗しました：${treasureError.message}`
      )

      setSavingEdit(false)
      return
    }

    const { data: ratingAuthResult, error: ratingAuthError } = await supabase.auth.getUser()
    if (ratingAuthError || !ratingAuthResult.user) {
      alert("ログイン状態を確認できないため、★評価を保存できませんでした。")
      setSavingEdit(false)
      return
    }

    const ratingSaveResult = editRating > 0
      ? await supabase.from("treasure_ratings").upsert(
          {
            treasure_id: editingTreasureId,
            user_id: ratingAuthResult.user.id,
            rating: editRating,
            updated_at: now,
          },
          { onConflict: "treasure_id,user_id" },
        )
      : await supabase.from("treasure_ratings").delete()
          .eq("treasure_id", editingTreasureId)
          .eq("user_id", ratingAuthResult.user.id)

    if (ratingSaveResult.error) {
      console.error("タイムライン上の評価保存に失敗:", ratingSaveResult.error)
      alert(`★評価の保存に失敗しました：${ratingSaveResult.error.message}`)
      setSavingEdit(false)
      return
    }

    const {
      error: visibilityError,
    } = await supabase
      .from("treasure_box_items")
      .update({
        visibility:
          editVisibility,
      })
      .eq(
        "box_id",
        targetItem.boxId
      )
      .eq(
        "treasure_id",
        editingTreasureId
      )

    if (visibilityError) {
      console.error(
        "公開範囲の更新に失敗:",
        visibilityError
      )

      alert(
        `公開範囲の更新に失敗しました：${visibilityError.message}`
      )

      setSavingEdit(false)
      return
    }

    setItems((current) =>
      current
        .map((item) =>
          item.treasureId ===
          editingTreasureId
            ? {
                ...item,
                title:
                  editTitle.trim(),
                description:
                  editDescription.trim() ||
                  null,
                url:
                  editUrl.trim() ||
                  null,
                thumbnailUrl:
                  thumbnailUrl,
                updatedAt: now,
                timelineOnUpdate:
                  editTimelineOnUpdate,
                visibility:
                  editVisibility,
              }
            : item
        )
        .sort((a, b) => {
          const aTime =
            a.timelineOnUpdate
              ? a.updatedAt
              : a.createdAt

          const bTime =
            b.timelineOnUpdate
              ? b.updatedAt
              : b.createdAt

          return (
            new Date(
              bTime
            ).getTime() -
            new Date(
              aTime
            ).getTime()
          )
        })
    )

    setSavingEdit(false)
    closeTreasureEdit()
  }

  function getEmptyMessage() {
    if (timelineMode === "mine") {
      return (
        <>
          じぶんの宝箱に宝物を入れると、
          <br />
          ここに表示されます。
        </>
      )
    }

    if (
      timelineMode ===
      "favorite"
    ) {
      return (
        <>
          気になる宝箱をお気に入りにすると、
          <br />
          ここに新しい宝物が表示されます。
        </>
      )
    }

    return (
      <>
        まだ新しい宝物がありません。
        <br />
        いろいろな公開宝箱を探してみよう。
      </>
    )
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] px-4 py-10 pb-28 text-gray-800 sm:px-6 sm:py-12 sm:pb-12">
      <div className="mx-auto max-w-3xl">

        {/* MENU */}

        <div className="flex justify-end">
          <SiteMenu />
        </div>

        {/* TIMELINE */}

        <div className="mt-8">
          {/* タブ */}

          <div className="mt-6 flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() =>
                setTimelineMode("mine")
              }
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                timelineMode === "mine"
                  ? "bg-[#FFB770] text-white"
                  : "border border-[#FFB770] bg-white text-[#FFB770]"
              }`}
            >
              MINE
            </button>

            <button
              type="button"
              onClick={() =>
                setTimelineMode(
                  "favorite"
                )
              }
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                timelineMode === "favorite"
                  ? "bg-[#FFB770] text-white"
                  : "border border-[#FFB770] bg-white text-[#FFB770]"
              }`}
            >
              FAVORITE
            </button>

            <button
              type="button"
              onClick={() =>
                setTimelineMode("all")
              }
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                timelineMode === "all"
                  ? "bg-[#FFB770] text-white"
                  : "border border-[#FFB770] bg-white text-[#FFB770]"
              }`}
            >
              WORLD
            </button>

          </div>
        </div>

        {/* 読み込み */}

        {loading ? (
          <div className="mt-10 rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">
              タイムラインを読み込み中...
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">

            <h2 className="text-xl font-bold">
              まだ宝物がありません。
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {getEmptyMessage()}
            </p>

            <a
              href="/boxes"
              className="mt-6 inline-block rounded-full bg-[#FFB770] px-6 py-3 font-bold text-white"
            >
              宝箱を見る
            </a>

          </div>
        ) : (
          <div className="mt-10 space-y-4">

            {items.map((item) => {
              const isFavorite =
                favoriteTreasureIds.includes(
                  item.treasureId
                )

              const isSaved =
                savedTreasureIds.includes(
                  item.treasureId
                )

              const visibilityIcon =
                getVisibilityIcon(
                  item.visibility
                )

              const ownTreasure =
                isMyTreasure(item)

              const currentStatus =
                item.statuses.find(
                  (status) =>
                    status.id ===
                    item.statusId
                ) ?? null

              return (
                <article
                  key={`${item.boxId}-${item.treasureId}`}
                  className="rounded-3xl bg-white px-5 py-5 shadow-sm sm:px-6"
                >

                  {/* 宝箱情報 */}

                  <div className="min-w-0 text-sm">

                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">

                      <a
                        href={`/boxes/${item.boxId}`}
                        className="hover:text-[#FFB770]"
                      >
                        <span className="font-bold text-gray-700">
                          {item.boxName}
                        </span>
                      </a>

                      <span className="text-gray-400">
                        @{item.boxUsername ||
                          "unknown"}
                      </span>

                      <span className="text-gray-400">
                        {formatDate(
                          item.updatedAt
                        )}
                      </span>

                      <span className="ml-4 flex items-center text-[#92C3E5]">
                        <Icon
                          name={
                            visibilityIcon
                          }
                          size={20}
                        />
                      </span>

                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      {ownTreasure && item.statuses.length > 0 ? (
                        <select
                          value={item.statusId ?? ""}
                          disabled={updatingStatusId === item.treasureId}
                          onChange={(e) => updateTreasureStatus(item, e.target.value)}
                          className="rounded-full border border-transparent px-3 py-1 text-xs font-bold outline-none"
                          style={{ backgroundColor: currentStatus?.color ?? "#f3f4f6" }}
                        >
                          <option value=""></option>
                          {item.statuses.map((status) => (
                            <option key={status.id} value={status.id}>
                              {status.name}
                            </option>
                          ))}
                        </select>
                      ) : item.statusName ? (
                        <span
                          className="inline-flex rounded-full px-3 py-1 text-xs font-bold"
                          style={{ backgroundColor: item.statusColor ?? "#f3f4f6" }}
                        >
                          {item.statusName}
                        </span>
                      ) : null}

                      <TreasureNotesRating treasureId={item.treasureId} mode="rating" />
                    </div>
                  </div>

                  <div className="mt-3 border-t border-gray-100" />

                  {/* 宝物 */}

                  <div className="mt-4">

                    <p className="text-lg font-bold leading-8 sm:text-xl">
                      {item.title}
                    </p>

                    {/* NEW */}

                    {isNew(
                      item.updatedAt
                    ) && (
                      <span className="mt-2 inline-block rounded-full bg-[#FFB770] px-2.5 py-1 text-xs font-bold text-white">
                        NEW
                      </span>
                    )}

                    {/* 説明 */}

                    {item.description && (
                      <p className="mt-3 text-sm leading-6 text-gray-700">
                        {item.description}
                      </p>
                    )}

                    {/* サムネイル */}

                    {item.thumbnailUrl && (
                      <a
                        href={
                          item.url ?? "#"
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 flex h-56 items-center justify-center overflow-hidden rounded-2xl bg-white sm:h-64"
                      >
                        <img
                          src={
                            item.thumbnailUrl
                          }
                          alt={
                            item.title
                          }
                          className="h-full w-full object-contain transition hover:opacity-90"
                        />
                      </a>
                    )}

                    {/* URL / X */}

                    {!item.thumbnailUrl &&
                      item.url &&
                      (isXPostUrl(
                        item.url
                      ) ? (
                        <XPost
                          url={
                            item.url
                          }
                        />
                      ) : (
                        <a
                          href={
                            item.url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 block break-all text-sm text-[#FFB770]"
                        >
                          {item.url}
                        </a>
                      ))}

                    {/* 操作 */}

                    <div className="mt-3 border-t border-gray-100 pt-2">

                      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">

                        {/* メモ */}
                        <TreasureNotesRating treasureId={item.treasureId} mode="notes" />

                        {/* 編集 */}

                        {ownTreasure && (
                          <button
                            type="button"
                            onClick={() =>
                              openTreasureEdit(
                                item
                              )
                            }
                            aria-label="宝物を編集"
                            className="flex h-10 w-10 items-center justify-center text-xl leading-none text-gray-400 transition hover:text-[#FFB770]"
                          >
                            ✎
                          </button>
                        )}

                        {/* お気に入り */}

                        <button
                          type="button"
                          onClick={() =>
                            toggleTreasureFavorite(
                              item.treasureId
                            )
                          }
                          aria-label="お気に入り"
                          className={`flex h-10 w-10 items-center justify-center text-2xl leading-none transition ${
                            isFavorite
                              ? "text-pink-500"
                              : "text-gray-300 hover:text-pink-400"
                          }`}
                        >
                          {isFavorite
                            ? "♥"
                            : "♡"}
                        </button>

                        {/* 保存 */}

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTreasureId(
                              item.treasureId
                            )
                          }
                          aria-label="宝箱に保存"
                          className="flex h-10 w-10 items-center justify-center transition hover:bg-gray-50"
                        >
                          <Bookmark2Icon
                            active={
                              isSaved
                            }
                          />
                        </button>

                      </div>

                    </div>

                  </div>

                </article>
              )
            })}

          </div>
        )}

      </div>

      {/* 宝物編集モーダル */}

      {editingTreasureId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 px-4 pb-24 pt-24">

          <div className="mx-auto w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl sm:p-8">

            <div className="flex items-center justify-between gap-3">

              <h3 className="text-base font-bold text-[#FFB770] sm:text-lg">
                宝物を編集
              </h3>

              <button
                type="button"
                onClick={
                  closeTreasureEdit
                }
                disabled={
                  savingEdit
                }
                className="shrink-0 text-xs font-bold text-gray-400 hover:text-gray-600 disabled:opacity-50 sm:text-sm"
              >
                × キャンセル
              </button>

            </div>

            <div className="mt-5 space-y-4">

              <div>
                <label className="mb-2 block text-sm font-bold">
                  タイトル
                </label>

                <input
                  type="text"
                  value={
                    editTitle
                  }
                  onChange={(e) =>
                    setEditTitle(
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-[#FFB770] bg-[#FFF9F3] px-4 py-3 outline-none focus:border-[#FFB770]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  説明
                </label>

                <textarea
                  value={
                    editDescription
                  }
                  onChange={(e) =>
                    setEditDescription(
                      e.target.value
                    )
                  }
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-[#FFB770] bg-[#FFF9F3] px-4 py-3 outline-none focus:border-[#FFB770]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  URL
                </label>

                <input
                  type="url"
                  value={
                    editUrl
                  }
                  onChange={(e) =>
                    setEditUrl(
                      e.target.value
                    )
                  }
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-[#FFB770] bg-[#FFF9F3] px-4 py-3 outline-none focus:border-[#FFB770]"
                />
              </div>

              {/* 公開範囲 */}

              <div className="rounded-2xl bg-[#FFF1E3] p-4">

                <p className="mb-3 text-sm font-bold">
                  宝物の公開範囲
                </p>

                <div className="grid gap-2 sm:grid-cols-3">

                  {[
                    {
                      value: "public" as const,
                      label: "公開",
                      icon: "world",
                    },
                    {
                      value: "private" as const,
                      label: "非公開",
                      icon: "key",
                    },
                    {
                      value: "friends" as const,
                      label: "秘宝",
                      icon: "diamond",
                    },
                  ].map(
                    (option) => (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        onClick={() =>
                          setEditVisibility(
                            option.value
                          )
                        }
                        className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-bold text-gray-900 transition ${
                          editVisibility === option.value
                            ? "border-orange-300 bg-white shadow-sm"
                            : "border-transparent bg-white/60 hover:bg-white"
                        }`}
                      >
                        <span className="text-gray-600">
                          <Icon name={option.icon} size={20} />
                        </span>
                        {option.label}
                      </button>
                    )
                  )}

                </div>

              </div>


              <div>
                <label className="mb-2 block text-sm font-bold">★ 評価</label>
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="1〜5つ星評価">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setEditRating(editRating === value ? 0 : value)}
                      aria-label={`${value}つ星`}
                      aria-pressed={editRating === value}
                      className={`text-3xl transition ${editRating >= value ? "text-amber-400" : "text-gray-300"}`}
                    >★</button>
                  ))}
                  {editRating > 0 && (
                    <button type="button" onClick={() => setEditRating(0)} className="ml-2 text-xs text-gray-400 underline">クリア</button>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">★を選んで上書き保存すると、評価も保存されます。</p>
              </div>

              {/* タイムライン再投稿 */}

              <div className="rounded-2xl bg-orange-50 p-4">

                <div className="flex items-center justify-between gap-4">

                  <div>
                    <p className="text-sm font-bold sm:text-base">
                      編集後もタイムラインに載せる
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      ONなら、編集した宝物を新着として再掲載します。
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setEditTimelineOnUpdate(
                        (current) =>
                          !current
                      )
                    }
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                      editTimelineOnUpdate
                        ? "bg-[#FFB770]"
                        : "bg-gray-300"
                    }`}
                    aria-label="タイムライン再投稿切り替え"
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                        editTimelineOnUpdate
                          ? "left-6"
                          : "left-1"
                      }`}
                    />
                  </button>

                </div>

              </div>

              {/* 保存 */}

              <button
                type="button"
                onClick={
                  saveTimelineTreasureEdit
                }
                disabled={
                  savingEdit
                }
                className="w-full rounded-full bg-[#FFB770] px-6 py-4 font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingEdit
                  ? "保存中..."
                  : "変更を保存する ✨"}
              </button>

              {/* キャンセル */}

              <button
                type="button"
                onClick={
                  closeTreasureEdit
                }
                disabled={
                  savingEdit
                }
                className="w-full rounded-full border border-gray-200 bg-white px-6 py-4 font-bold text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                キャンセル
              </button>

            </div>

          </div>

        </div>
      )}

      {/* 保存先選択モーダル */}

      {selectedTreasureId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 px-4 py-6 sm:px-6">

          <div className="flex min-h-full items-center justify-center">

            <div className="my-4 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl sm:my-6">

              <div className="flex items-center justify-between gap-4">

                <h2 className="text-xl font-bold">
                  宝箱に保存
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedTreasureId(
                      null
                    )
                  }
                  disabled={
                    saving
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-gray-300 transition hover:bg-gray-100 hover:text-gray-500 disabled:opacity-50"
                  aria-label="閉じる"
                  title="閉じる"
                >
                  ×
                </button>

              </div>

              <p className="mt-2 text-sm text-gray-500">
                保存する宝箱を選んでください。
              </p>

              {myBoxes.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-[#FFF1E3] p-5 text-center">

                  <p className="font-bold">
                    まだ宝箱がありません。
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    先に自分の宝箱を作ってみよう。
                  </p>

                  <a
                    href="/create"
                    className="mt-4 inline-block rounded-full bg-[#FFB770] px-5 py-2.5 font-bold text-white"
                  >
                    宝箱をつくる
                  </a>

                </div>
              ) : (
                <div className="mt-5 max-h-[calc(100vh-220px)] space-y-2 overflow-y-auto pr-1">

                  {myBoxes.map(
                    (box) => (
                      <button
                        key={
                          box.id
                        }
                        type="button"
                        onClick={() =>
                          saveTreasure(
                            box.id
                          )
                        }
                        disabled={
                          saving
                        }
                        className="flex w-full items-center justify-between rounded-2xl border border-[#FFB770] bg-[#FFF9F3] px-4 py-4 text-left transition hover:bg-[#FFF1E3] disabled:opacity-50"
                      >

                        <div className="min-w-0">

                          <p className="font-bold">
                            {
                              box.name
                            }
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {box.visibility ===
                            "friends"
                              ? "💎 秘密の宝箱"
                              : box.is_public
                                ? "公開"
                                : "🔒 非公開"}
                          </p>

                        </div>

                        <span className="ml-4 shrink-0 text-[#FFB770]">
                          保存 →
                        </span>

                      </button>
                    )
                  )}

                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* スマホ下部固定メニューとの重なり防止 */}

      <div className="h-20 sm:hidden" />

    </main>
  )
}