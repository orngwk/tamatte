"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import SiteMenu from "@/app/components/SiteMenu"
import XPost from "@/app/components/XPost"
import TreasureNotesRating from "@/app/components/TreasureNotesRating"

type TreasureBox = {
  id: string
  name: string
  description: string | null
  is_public: boolean
  visibility: "public" | "private" | "friends" | null
  username: string
  created_at: string
}

type Treasure = {
  id: string
  title: string
  url: string | null
  thumbnail_url: string | null
  description: string | null
  updated_at: string
  timeline_on_update: boolean
}

type BoxStatus = {
  id: string
  name: string
  color: string
  position: number
}

type TreasureItem = {
  id: string
  treasure_id: string
  position: number
  status_id: string | null
  visibility: "box" | "public" | "private" | "friends" | null
}

type MyBox = {
  id: string
  name: string
  is_public: boolean
  visibility: "public" | "private" | "friends" | null
}

type TreasureSave = {
  id: string
  box_id: string
  copied_treasure_id: string | null
}

type FollowUser = {
  username: string
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


function PenIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  )
}

function TrashIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  )
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
    <Icon
      name={iconName}
      size={20}
    />
  )
}

export default function TreasureBoxPage() {
  const params = useParams()
  const boxId = params.id as string

  const [box, setBox] =
    useState<TreasureBox | null>(null)

  const [treasures, setTreasures] =
    useState<Treasure[]>([])

  const [statuses, setStatuses] =
    useState<BoxStatus[]>([])

  const [treasureItems, setTreasureItems] =
    useState<TreasureItem[]>([])

  const [favoriteTreasureIds, setFavoriteTreasureIds] =
    useState<string[]>([])

  const [isBoxFavorite, setIsBoxFavorite] =
    useState(false)

  const [myUsername, setMyUsername] =
    useState<string | null>(null)

  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] =
    useState("")

  const [statusFilter, setStatusFilter] =
    useState("all")

  const [errorMessage, setErrorMessage] =
    useState("")

  const [editingTreasureId, setEditingTreasureId] =
    useState<string | null>(null)

  const [editTitle, setEditTitle] =
    useState("")

  const [editDescription, setEditDescription] =
    useState("")

  const [editRating, setEditRating] = useState(0)

  const [editUrl, setEditUrl] =
    useState("")

  const [editTimelineOnUpdate, setEditTimelineOnUpdate] =
    useState(true)

  const [fetchingEditTitle, setFetchingEditTitle] =
    useState(false)

  const [editTreasureVisibility, setEditTreasureVisibility] =
    useState<"public" | "private" | "friends">("public")

  const [editing, setEditing] = useState(false)
  const [savingBox, setSavingBox] = useState(false)

  const [editName, setEditName] = useState("")
  const [editBoxDescription, setEditBoxDescription] = useState("")
  const [editVisibility, setEditVisibility] =
    useState<"public" | "private" | "friends">("public")

  const [followingUsers, setFollowingUsers] =
    useState<FollowUser[]>([])

  const [selectedSecretUsers, setSelectedSecretUsers] =
    useState<string[]>([])

  const [loadingFollowing, setLoadingFollowing] =
    useState(false)

  const [newStatus, setNewStatus] = useState("")
  const [newStatusColor, setNewStatusColor] = useState("#f3f4f6")
  const [editingStatusId, setEditingStatusId] =
    useState<string | null>(null)
  const [editingStatusName, setEditingStatusName] =
    useState("")
  const [editingStatusColor, setEditingStatusColor] =
    useState("#f3f4f6")
  const [statusSaving, setStatusSaving] = useState(false)

  const [savingEdit, setSavingEdit] =
    useState(false)

  const [myBoxes, setMyBoxes] =
    useState<MyBox[]>([])

  const [treasureSaves, setTreasureSaves] =
    useState<Record<string, TreasureSave[]>>({})

  const [selectedSaveTreasureId, setSelectedSaveTreasureId] =
    useState<string | null>(null)

  const [savingToBox, setSavingToBox] =
    useState(false)

  useEffect(() => {
    async function loadBox() {
      setLoading(true)
      setErrorMessage("")

      const {
        data: { user },
      } = await supabase.auth.getUser()

      let username: string | null = null

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle()

        username =
          profile?.username?.trim().toLowerCase() ?? null
      }

      setMyUsername(username)

      if (username) {
        setLoadingFollowing(true)

        const { data: followData, error: followError } =
          await supabase
            .from("follows")
            .select("following_username")
            .eq("follower_username", username)
            .order("created_at", { ascending: false })

        if (followError) {
          console.error(
            "フォロー中ユーザーの取得に失敗:",
            followError
          )
          setFollowingUsers([])
        } else {
          setFollowingUsers(
            (followData ?? []).map((item) => ({
              username:
                item.following_username
                  .trim()
                  .toLowerCase(),
            }))
          )
        }

        const {
          data: memberData,
          error: memberError,
        } = await supabase
          .from("secret_box_members")
          .select("username")
          .eq("box_id", boxId)

        if (memberError) {
          console.error(
            "秘密の宝箱の公開対象取得に失敗:",
            memberError
          )
          setSelectedSecretUsers([])
        } else {
          setSelectedSecretUsers(
            (memberData ?? []).map((member) =>
              member.username.trim().toLowerCase()
            )
          )
        }

        setLoadingFollowing(false)
      } else {
        setFollowingUsers([])
        setSelectedSecretUsers([])
      }

      if (username) {
        const { data: myBoxData, error: myBoxError } = await supabase
          .from("treasure_boxes")
          .select("id, name, is_public, visibility")
          .eq("username", username)
          .order("created_at", { ascending: false })

        if (myBoxError) {
          console.error("自分の宝箱の取得に失敗:", myBoxError)
        } else {
          setMyBoxes(myBoxData ?? [])
        }
      } else {
        setMyBoxes([])
      }

      const {
        data: boxData,
        error: boxError,
      } = await supabase
        .from("treasure_boxes")
        .select("*")
        .eq("id", boxId)
        .single()

      if (boxError) {
        console.error(
          "宝箱の取得に失敗:",
          boxError
        )

        setErrorMessage(
          `宝箱の取得に失敗しました：${boxError.message}`
        )

        setLoading(false)
        return
      }

      setBox(boxData)

      const {
        data: statusData,
        error: statusError,
      } = await supabase
        .from("box_statuses")
        .select("id, name, color, position")
        .eq("box_id", boxId)
        .order("position", {
          ascending: true,
        })

      if (statusError) {
        console.error(
          "ステータスの取得に失敗:",
          statusError
        )
      } else {
        setStatuses(statusData ?? [])
      }

      const {
        data: itemData,
        error: itemError,
      } = await supabase
        .from("treasure_box_items")
        .select(
          "id, treasure_id, position, status_id, visibility"
        )
        .eq("box_id", boxId)
        .order("position", {
          ascending: true,
        })

      if (itemError) {
        console.error(
          "宝箱の中身の取得に失敗:",
          itemError
        )

        setErrorMessage(
          `宝箱の中身の取得に失敗しました：${itemError.message}`
        )

        setLoading(false)
        return
      }

      const items: TreasureItem[] =
        itemData ?? []

      setTreasureItems(items)

      const treasureIds = items.map(
        (item) => item.treasure_id
      )

      if (treasureIds.length === 0) {
        setTreasures([])
        setFavoriteTreasureIds([])

        if (username) {
          const {
            data: boxFavoriteData,
            error: boxFavoriteError,
          } = await supabase
            .from("box_favorites")
            .select("id")
            .eq("username", username)
            .eq("box_id", boxId)
            .maybeSingle()

          if (boxFavoriteError) {
            console.error(
              "宝箱のお気に入り取得に失敗:",
              boxFavoriteError
            )
          } else {
            setIsBoxFavorite(Boolean(boxFavoriteData))
          }
        } else {
          setIsBoxFavorite(false)
        }

        setLoading(false)
        return
      }

      const {
        data: treasureData,
        error: treasureError,
      } = await supabase
        .from("treasures")
        .select(
          "id, title, url, thumbnail_url, description, updated_at, timeline_on_update"
        )
        .in("id", treasureIds)

      if (treasureError) {
        console.error(
          "宝物の取得に失敗:",
          treasureError
        )

        setErrorMessage(
          `宝物の取得に失敗しました：${treasureError.message}`
        )

        setLoading(false)
        return
      }

      const sortedTreasures = treasureIds
        .map((id) =>
          treasureData?.find(
            (treasure) =>
              treasure.id === id
          )
        )
        .filter(
          (
            treasure
          ): treasure is Treasure =>
            treasure !== undefined
        )
        .sort(
          (a, b) =>
            new Date(
              b.updated_at
            ).getTime() -
            new Date(
              a.updated_at
            ).getTime()
        )

      setTreasures(sortedTreasures)

      const editTreasureId =
        new URLSearchParams(window.location.search).get(
          "editTreasure"
        )

      if (editTreasureId) {
        const targetTreasure = sortedTreasures.find(
          (treasure) => treasure.id === editTreasureId
        )

        if (targetTreasure) {
          const targetItem = items.find(
            (item) => item.treasure_id === editTreasureId
          )

          setEditingTreasureId(editTreasureId)
          setEditTitle(targetTreasure.title)
          setEditDescription(targetTreasure.description ?? "")
          setEditUrl(targetTreasure.url ?? "")
          setEditTimelineOnUpdate(
            targetTreasure.timeline_on_update ?? true
          )
          setEditTreasureVisibility(
            targetItem?.visibility === "private"
              ? "private"
              : targetItem?.visibility === "friends"
                ? "friends"
                : "public"
          )
        }
      }

      if (username) {
        const {
          data: boxFavoriteData,
          error: boxFavoriteError,
        } = await supabase
          .from("box_favorites")
          .select("id")
          .eq("username", username)
          .eq("box_id", boxId)
          .maybeSingle()

        if (boxFavoriteError) {
          console.error(
            "宝箱のお気に入り取得に失敗:",
            boxFavoriteError
          )
        } else {
          setIsBoxFavorite(Boolean(boxFavoriteData))
        }

        const {
          data: favoriteData,
          error: favoriteError,
        } = await supabase
          .from("treasure_favorites")
          .select("treasure_id")
          .eq("username", username)
          .in("treasure_id", treasureIds)

        if (favoriteError) {
          console.error(
            "お気に入りの取得に失敗:",
            favoriteError
          )
        } else {
          setFavoriteTreasureIds(
            favoriteData?.map(
              (item) =>
                item.treasure_id
            ) ?? []
          )
        }
      } else {
        setIsBoxFavorite(false)
        setFavoriteTreasureIds([])
      }

      if (username) {
        const { data: saveData, error: saveError } = await supabase
          .from("treasure_saves")
          .select("id, box_id, treasure_id, copied_treasure_id")
          .eq("username", username)
          .in("treasure_id", treasureIds)

        if (saveError) {
          console.error("保存情報の取得に失敗:", saveError)
        } else {
          const grouped: Record<string, TreasureSave[]> = {}

          for (const save of saveData ?? []) {
            if (!grouped[save.treasure_id]) {
              grouped[save.treasure_id] = []
            }

            grouped[save.treasure_id].push({
              id: save.id,
              box_id: save.box_id,
              copied_treasure_id: save.copied_treasure_id,
            })
          }

          setTreasureSaves(grouped)
        }
      } else {
        setTreasureSaves({})
      }

      setLoading(false)
    }

    if (boxId) {
      loadBox()
    }
  }, [boxId])

  async function changeStatus(
    itemId: string,
    treasureId: string,
    statusId: string
  ) {
    const newStatusId =
      statusId || null

    const now =
      new Date().toISOString()

    const { error: itemError } =
      await supabase
        .from("treasure_box_items")
        .update({
          status_id: newStatusId,
        })
        .eq("id", itemId)

    if (itemError) {
      console.error(
        "ステータス変更に失敗:",
        itemError
      )

      alert(
        `ステータス変更に失敗しました：${itemError.message}`
      )

      return
    }

    const { error: treasureError } =
      await supabase
        .from("treasures")
        .update({
          updated_at: now,
        })
        .eq("id", treasureId)

    if (treasureError) {
      console.error(
        "更新日時の変更に失敗:",
        treasureError
      )

      alert(
        `更新日時の変更に失敗しました：${treasureError.message}`
      )

      return
    }

    setTreasureItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status_id:
                newStatusId,
            }
          : item
      )
    )

    setTreasures((current) =>
      current
        .map((treasure) =>
          treasure.id === treasureId
            ? {
                ...treasure,
                updated_at: now,
              }
            : treasure
        )
        .sort(
          (a, b) =>
            new Date(
              b.updated_at
            ).getTime() -
            new Date(
              a.updated_at
            ).getTime()
        )
    )
  }

  function openEdit() {
    if (!box) {
      return
    }

    setEditName(box.name)
    setEditBoxDescription(box.description ?? "")
    setEditVisibility(
      box.visibility === "friends"
        ? "friends"
        : box.visibility === "private"
          ? "private"
          : box.is_public
            ? "public"
            : "private"
    )
    setNewStatus("")
    setNewStatusColor("#f3f4f6")
    setEditingStatusId(null)
    setEditingStatusName("")
    setEditingStatusColor("#f3f4f6")
    setEditing(true)
  }

  function closeEdit() {
    if (savingBox || statusSaving) {
      return
    }

    setEditing(false)
    setEditingStatusId(null)
    setEditingStatusName("")
    setEditingStatusColor("#f3f4f6")
    setNewStatus("")
    setNewStatusColor("#f3f4f6")
  }

  async function saveBox() {
    if (!box) {
      return
    }

    const name = editName.trim()
    const description = editBoxDescription.trim()

    if (!name) {
      alert("宝箱の名前を入力してください")
      return
    }

    if (
      editVisibility === "friends" &&
      selectedSecretUsers.length === 0
    ) {
      alert(
        "秘密の宝箱にする場合は、見せる相手を1人以上選んでください"
      )
      return
    }

    setSavingBox(true)

    const { error } = await supabase
      .from("treasure_boxes")
      .update({
        name,
        description: description || null,
        visibility: editVisibility,
        is_public: editVisibility === "public",
      })
      .eq("id", box.id)

    if (error) {
      console.error(
        "宝箱の更新に失敗:",
        error
      )

      alert(
        `宝箱の更新に失敗しました：${error.message}`
      )

      setSavingBox(false)
      return
    }

    setBox({
      ...box,
      name,
      description: description || null,
      visibility: editVisibility,
      is_public: editVisibility === "public",
    })

    const { error: memberDeleteError } = await supabase
      .from("secret_box_members")
      .delete()
      .eq("box_id", box.id)

    if (memberDeleteError) {
      console.error(
        "秘密の宝箱の公開対象削除に失敗:",
        memberDeleteError
      )
      alert(
        `秘密の宝箱の公開対象更新に失敗しました：${memberDeleteError.message}`
      )
      setSavingBox(false)
      return
    }

    if (
      editVisibility === "friends" &&
      selectedSecretUsers.length > 0
    ) {
      const memberRows = selectedSecretUsers.map(
        (selectedUsername) => ({
          box_id: box.id,
          username: selectedUsername,
        })
      )

      const { error: memberInsertError } = await supabase
        .from("secret_box_members")
        .insert(memberRows)

      if (memberInsertError) {
        console.error(
          "秘密の宝箱の公開対象保存に失敗:",
          memberInsertError
        )
        alert(
          `秘密の宝箱の公開対象保存に失敗しました：${memberInsertError.message}`
        )
        setSavingBox(false)
        return
      }
    }

    setSavingBox(false)

    alert("宝箱を更新しました！✨")

    setEditing(false)
  }

  async function deleteBox() {
    if (!box || !isOwner) {
      return
    }

    const confirmed = window.confirm(
      `「${box.name}」を削除しますか？\n\nこの宝箱に入っている宝物も、この宝箱からは削除されます。\n他の宝箱にも入っている宝物は残ります。`
    )

    if (!confirmed) {
      return
    }

    setSavingBox(true)

    const currentTreasureIds = treasureItems.map(
      (item) => item.treasure_id
    )

    if (currentTreasureIds.length > 0) {
      const { data: allItems, error: allItemsError } = await supabase
        .from("treasure_box_items")
        .select("treasure_id, box_id")
        .in("treasure_id", currentTreasureIds)

      if (allItemsError) {
        console.error("宝物の参照確認に失敗:", allItemsError)
        alert(`宝箱の削除に失敗しました：${allItemsError.message}`)
        setSavingBox(false)
        return
      }

      const otherBoxTreasureIds = new Set(
        (allItems ?? [])
          .filter((item) => item.box_id !== box.id)
          .map((item) => item.treasure_id)
      )

      const treasuresToDelete = currentTreasureIds.filter(
        (treasureId) => !otherBoxTreasureIds.has(treasureId)
      )

      const { error: itemDeleteError } = await supabase
        .from("treasure_box_items")
        .delete()
        .eq("box_id", box.id)

      if (itemDeleteError) {
        console.error("宝箱内の宝物削除に失敗:", itemDeleteError)
        alert(`宝箱の削除に失敗しました：${itemDeleteError.message}`)
        setSavingBox(false)
        return
      }

      if (treasuresToDelete.length > 0) {
        const { error: treasureDeleteError } = await supabase
          .from("treasures")
          .delete()
          .in("id", treasuresToDelete)

        if (treasureDeleteError) {
          console.error("不要な宝物の削除に失敗:", treasureDeleteError)
        }
      }
    }

    await supabase
      .from("box_favorites")
      .delete()
      .eq("box_id", box.id)

    await supabase
      .from("treasure_saves")
      .delete()
      .eq("box_id", box.id)

    const { error: boxDeleteError } = await supabase
      .from("treasure_boxes")
      .delete()
      .eq("id", box.id)
      .eq("username", myUsername ?? "")

    if (boxDeleteError) {
      console.error("宝箱の削除に失敗:", boxDeleteError)
      alert(`宝箱の削除に失敗しました：${boxDeleteError.message}`)
      setSavingBox(false)
      return
    }

    window.location.href = "/boxes"
  }

  async function deleteTreasure(
    treasureId: string,
    treasureTitle: string
  ) {
    if (!isOwner || !myUsername) {
      return
    }

    const confirmed = window.confirm(
      `「${treasureTitle}」を削除しますか？\n\nこの宝箱から宝物を削除します。`
    )

    if (!confirmed) {
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    if (authData.user) {
      const ratingResult = editRating > 0
        ? await supabase.from("treasure_ratings").upsert({
            treasure_id: treasureId,
            user_id: authData.user.id,
            rating: editRating,
            updated_at: new Date().toISOString(),
          }, { onConflict: "treasure_id,user_id" })
        : await supabase.from("treasure_ratings").delete()
            .eq("treasure_id", treasureId)
            .eq("user_id", authData.user.id)

      if (ratingResult.error) {
        console.error("評価の保存に失敗:", ratingResult.error)
        alert(`評価の保存に失敗しました：${ratingResult.error.message}`)
        setSavingEdit(false)
        return
      }
    }

    // 編集画面で設定した★評価も、宝物本体とは別テーブルへ保存する
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      console.error("評価保存時のユーザー取得に失敗:", authError)
      alert("ログイン状態を確認できないため、★評価を保存できませんでした。")
      setSavingEdit(false)
      return
    }

    if (editRating > 0) {
      const { error: ratingError } = await supabase
        .from("treasure_ratings")
        .upsert(
          {
            treasure_id: treasureId,
            user_id: authData.user.id,
            rating: editRating,
          },
          { onConflict: "treasure_id,user_id" },
        )

      if (ratingError) {
        console.error("★評価の保存に失敗:", ratingError)
        alert(`★評価の保存に失敗しました：${ratingError.message}`)
        setSavingEdit(false)
        return
      }
    } else {
      const { error: ratingError } = await supabase
        .from("treasure_ratings")
        .delete()
        .eq("treasure_id", treasureId)
        .eq("user_id", authData.user.id)

      if (ratingError) {
        console.error("★評価の解除に失敗:", ratingError)
        alert(`★評価の解除に失敗しました：${ratingError.message}`)
        setSavingEdit(false)
        return
      }
    }

    const currentItem = treasureItems.find(
      (item) => item.treasure_id === treasureId
    )

    if (!currentItem) {
      return
    }

    const { data: allItems, error: allItemsError } = await supabase
      .from("treasure_box_items")
      .select("id, box_id")
      .eq("treasure_id", treasureId)

    if (allItemsError) {
      console.error("宝物の参照確認に失敗:", allItemsError)
      alert(`宝物の削除に失敗しました：${allItemsError.message}`)
      return
    }

    const { error: itemDeleteError } = await supabase
      .from("treasure_box_items")
      .delete()
      .eq("id", currentItem.id)

    if (itemDeleteError) {
      console.error("宝物の削除に失敗:", itemDeleteError)
      alert(`宝物の削除に失敗しました：${itemDeleteError.message}`)
      return
    }

    const hasOtherItems = (allItems ?? []).some(
      (item) => item.id !== currentItem.id
    )

    if (!hasOtherItems) {
      await supabase
        .from("treasure_favorites")
        .delete()
        .eq("treasure_id", treasureId)

      await supabase
        .from("treasure_saves")
        .delete()
        .eq("treasure_id", treasureId)

      const { error: treasureDeleteError } = await supabase
        .from("treasures")
        .delete()
        .eq("id", treasureId)

      if (treasureDeleteError) {
        console.error("宝物本体の削除に失敗:", treasureDeleteError)
        alert(`宝物の削除に失敗しました：${treasureDeleteError.message}`)
        return
      }
    }

    setTreasureItems((current) =>
      current.filter((item) => item.id !== currentItem.id)
    )
    setTreasures((current) =>
      current.filter((treasure) => treasure.id !== treasureId)
    )
    setFavoriteTreasureIds((current) =>
      current.filter((id) => id !== treasureId)
    )
    setTreasureSaves((current) => {
      const next = { ...current }
      delete next[treasureId]
      return next
    })

    alert("宝物を削除しました。")
  }

  async function addStatus() {
    const statusName = newStatus.trim()

    if (!statusName) {
      alert("ステータス名を入力してください")
      return
    }

    const duplicated = statuses.some(
      (status) => status.name === statusName
    )

    if (duplicated) {
      alert("同じ名前のステータスがあります")
      return
    }

    setStatusSaving(true)

    const nextPosition =
      statuses.length > 0
        ? Math.max(
            ...statuses.map(
              (status) => status.position
            )
          ) + 1
        : 0

    const {
      data,
      error,
    } = await supabase
      .from("box_statuses")
      .insert({
        box_id: boxId,
        name: statusName,
        position: nextPosition,
        color: newStatusColor,
      })
      .select("id, name, color, position")
      .single()

    if (error) {
      console.error(
        "ステータス追加に失敗:",
        error
      )

      alert(
        `ステータスの追加に失敗しました：${error.message}`
      )

      setStatusSaving(false)
      return
    }

    setStatuses((current) => [
      ...current,
      data,
    ])

    setNewStatus("")
    setNewStatusColor("#f3f4f6")
    setStatusSaving(false)
  }

  function startEditStatus(status: BoxStatus) {
    setEditingStatusId(status.id)
    setEditingStatusName(status.name)
    setEditingStatusColor(status.color || "#f3f4f6")
  }

  async function saveStatus(statusId: string) {
    const name = editingStatusName.trim()

    if (!name) {
      alert("ステータス名を入力してください")
      return
    }

    const duplicated = statuses.some(
      (status) =>
        status.id !== statusId &&
        status.name === name
    )

    if (duplicated) {
      alert("同じ名前のステータスがあります")
      return
    }

    setStatusSaving(true)

    const { error } = await supabase
      .from("box_statuses")
      .update({
        name,
        color: editingStatusColor,
      })
      .eq("id", statusId)

    if (error) {
      console.error(
        "ステータス更新に失敗:",
        error
      )

      alert(
        `ステータスの更新に失敗しました：${error.message}`
      )

      setStatusSaving(false)
      return
    }

    setStatuses((current) =>
      current.map((status) =>
        status.id === statusId
          ? {
              ...status,
              name,
              color: editingStatusColor,
            }
          : status
      )
    )

    setEditingStatusId(null)
    setEditingStatusName("")
    setEditingStatusColor("#f3f4f6")
    setStatusSaving(false)
  }

  async function moveStatus(
    statusId: string,
    direction: "up" | "down"
  ) {
    if (statusSaving) {
      return
    }

    const currentIndex = statuses.findIndex(
      (status) => status.id === statusId
    )

    if (currentIndex === -1) {
      return
    }

    const targetIndex =
      direction === "up"
        ? currentIndex - 1
        : currentIndex + 1

    if (
      targetIndex < 0 ||
      targetIndex >= statuses.length
    ) {
      return
    }

    const currentStatus = statuses[currentIndex]
    const targetStatus = statuses[targetIndex]

    setStatusSaving(true)

    const { error: currentError } = await supabase
      .from("box_statuses")
      .update({
        position: targetStatus.position,
      })
      .eq("id", currentStatus.id)

    if (currentError) {
      console.error(
        "ステータスの順番変更に失敗:",
        currentError
      )

      alert(
        `ステータスの順番変更に失敗しました：${currentError.message}`
      )

      setStatusSaving(false)
      return
    }

    const { error: targetError } = await supabase
      .from("box_statuses")
      .update({
        position: currentStatus.position,
      })
      .eq("id", targetStatus.id)

    if (targetError) {
      console.error(
        "ステータスの順番変更に失敗:",
        targetError
      )

      // 片方だけ更新されてしまった場合に元へ戻す
      await supabase
        .from("box_statuses")
        .update({
          position: currentStatus.position,
        })
        .eq("id", currentStatus.id)

      alert(
        `ステータスの順番変更に失敗しました：${targetError.message}`
      )

      setStatusSaving(false)
      return
    }

    const nextStatuses = [...statuses]
    nextStatuses[currentIndex] = {
      ...currentStatus,
      position: targetStatus.position,
    }
    nextStatuses[targetIndex] = {
      ...targetStatus,
      position: currentStatus.position,
    }

    nextStatuses.sort(
      (a, b) => a.position - b.position
    )

    setStatuses(nextStatuses)
    setStatusSaving(false)
  }

  async function deleteStatus(
    status: BoxStatus
  ) {
    const confirmed = window.confirm(
      `「${status.name}」を削除しますか？\n\nこのステータスが付いている宝物は「状態なし」になります。`
    )

    if (!confirmed) {
      return
    }

    setStatusSaving(true)

    const { error } = await supabase
      .from("box_statuses")
      .delete()
      .eq("id", status.id)

    if (error) {
      console.error(
        "ステータス削除に失敗:",
        error
      )

      alert(
        `ステータスの削除に失敗しました：${error.message}`
      )

      setStatusSaving(false)
      return
    }

    setStatuses((current) =>
      current.filter(
        (item) => item.id !== status.id
      )
    )

    setTreasureItems((current) =>
      current.map((item) =>
        item.status_id === status.id
          ? {
              ...item,
              status_id: null,
            }
          : item
      )
    )

    setStatusSaving(false)
  }


  async function toggleBoxFavorite() {
    if (!myUsername) {
      alert("お気に入りを使うにはログインしてください")
      return
    }

    if (isBoxFavorite) {
      const { error } = await supabase
        .from("box_favorites")
        .delete()
        .eq("username", myUsername)
        .eq("box_id", boxId)

      if (error) {
        console.error(
          "宝箱のお気に入り解除に失敗:",
          error
        )

        alert(
          `お気に入り解除に失敗しました：${error.message}`
        )

        return
      }

      setIsBoxFavorite(false)
    } else {
      const { error } = await supabase
        .from("box_favorites")
        .insert({
          username: myUsername,
          box_id: boxId,
        })

      if (error) {
        console.error(
          "宝箱のお気に入り登録に失敗:",
          error
        )

        alert(
          `お気に入り登録に失敗しました：${error.message}`
        )

        return
      }

      setIsBoxFavorite(true)
    }
  }

  async function toggleFavorite(
    treasureId: string
  ) {
    if (!myUsername) {
      alert("お気に入りを使うにはログインしてください")
      return
    }

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
            myUsername
          )
          .eq(
            "treasure_id",
            treasureId
          )

      if (error) {
        console.error(
          "お気に入り解除に失敗:",
          error
        )

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
            username: myUsername,
            treasure_id:
              treasureId,
          })

      if (error) {
        console.error(
          "お気に入り登録に失敗:",
          error
        )

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

  function openSaveTreasure(treasureId: string) {
    if (!myUsername) {
      alert("保存するにはログインしてください")
      return
    }

    setSelectedSaveTreasureId(treasureId)
  }

  async function copyTreasureToMyBox(boxId: string) {
    if (!selectedSaveTreasureId || !myUsername) {
      return
    }

    const sourceTreasure = treasures.find(
      (treasure) => treasure.id === selectedSaveTreasureId
    )

    const targetBox = myBoxes.find((box) => box.id === boxId)

    if (!sourceTreasure || !targetBox) {
      return
    }

    const alreadySaved = (treasureSaves[selectedSaveTreasureId] ?? []).some(
      (save) => save.box_id === boxId
    )

    if (alreadySaved) {
      alert("この宝物はすでにその宝箱に保存されています。")
      return
    }

    setSavingToBox(true)

    const savedAt = new Date().toISOString()

    const { data: copiedTreasure, error: treasureError } = await supabase
      .from("treasures")
      .insert({
        title: sourceTreasure.title,
        url: sourceTreasure.url,
        thumbnail_url: sourceTreasure.thumbnail_url,
        description: null,
        created_at: savedAt,
        updated_at: savedAt,
        timeline_on_update: false,
      })
      .select("id")
      .single()

    if (treasureError || !copiedTreasure) {
      console.error("宝物のコピーに失敗:", treasureError)
      alert(`宝物のコピーに失敗しました：${treasureError?.message ?? "不明なエラー"}`)
      setSavingToBox(false)
      return
    }

    const { error: itemError } = await supabase
      .from("treasure_box_items")
      .insert({
        box_id: boxId,
        treasure_id: copiedTreasure.id,
        position: 0,
        visibility:
          targetBox.visibility === "friends"
            ? "friends"
            : targetBox.visibility === "private"
              ? "private"
              : "public",
      })

    if (itemError) {
      console.error("宝箱へのコピー追加に失敗:", itemError)
      await supabase.from("treasures").delete().eq("id", copiedTreasure.id)
      alert(`宝箱への保存に失敗しました：${itemError.message}`)
      setSavingToBox(false)
      return
    }

    const { data: saveRecord, error: saveError } = await supabase
      .from("treasure_saves")
      .insert({
        username: myUsername,
        treasure_id: selectedSaveTreasureId,
        box_id: boxId,
        copied_treasure_id: copiedTreasure.id,
      })
      .select("id, box_id, copied_treasure_id")
      .single()

    if (saveError || !saveRecord) {
      console.error("保存記録の作成に失敗:", saveError)
      await supabase.from("treasure_box_items").delete().eq("box_id", boxId).eq("treasure_id", copiedTreasure.id)
      await supabase.from("treasures").delete().eq("id", copiedTreasure.id)
      alert(`保存記録の作成に失敗しました：${saveError?.message ?? "不明なエラー"}`)
      setSavingToBox(false)
      return
    }

    setTreasureSaves((current) => ({
      ...current,
      [selectedSaveTreasureId]: [
        ...(current[selectedSaveTreasureId] ?? []),
        {
          id: saveRecord.id,
          box_id: saveRecord.box_id,
          copied_treasure_id: saveRecord.copied_treasure_id,
        },
      ],
    }))

    setSavingToBox(false)
    setSelectedSaveTreasureId(null)
    alert(`「${targetBox.name}」に宝物をコピーして保存しました！🔖`)
  }

  async function removeTreasureSave(
    treasureId: string,
    save: TreasureSave
  ) {
    if (!myUsername) {
      return
    }

    setSavingToBox(true)

    const { error: saveError } = await supabase
      .from("treasure_saves")
      .delete()
      .eq("id", save.id)
      .eq("username", myUsername)

    if (saveError) {
      console.error("保存解除に失敗:", saveError)
      alert(`保存解除に失敗しました：${saveError.message}`)
      setSavingToBox(false)
      return
    }

    if (save.copied_treasure_id) {
      await supabase
        .from("treasure_box_items")
        .delete()
        .eq("box_id", save.box_id)
        .eq("treasure_id", save.copied_treasure_id)

      await supabase
        .from("treasures")
        .delete()
        .eq("id", save.copied_treasure_id)
    }

    setTreasureSaves((current) => ({
      ...current,
      [treasureId]: (current[treasureId] ?? []).filter(
        (item) => item.id !== save.id
      ),
    }))

    setSavingToBox(false)
  }

  async function startEditTreasure(
    treasure: Treasure
  ) {
    setEditingTreasureId(
      treasure.id
    )

    setEditTitle(
      treasure.title
    )

    setEditDescription(
      treasure.description ?? ""
    )

    setEditUrl(
      treasure.url ?? ""
    )

    setEditRating(0)
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user) {
      const { data: ratingData, error: ratingLoadError } = await supabase
        .from("treasure_ratings")
        .select("rating")
        .eq("treasure_id", treasure.id)
        .eq("user_id", authData.user.id)
        .maybeSingle()
      if (ratingLoadError) {
        console.error("評価の取得に失敗:", ratingLoadError)
      } else {
        setEditRating(ratingData?.rating ?? 0)
      }
    }

    setEditTimelineOnUpdate(
      treasure.timeline_on_update ??
        true
    )

    const item = treasureItems.find(
      (currentItem) => currentItem.treasure_id === treasure.id
    )

    setEditTreasureVisibility(
      item?.visibility === "private"
        ? "private"
        : item?.visibility === "friends"
          ? "friends"
          : "public"
    )
  }

  function cancelEditTreasure() {
    setEditingTreasureId(null)
    setEditTitle("")
    setEditDescription("")
    setEditUrl("")
    setEditRating(0)
    setEditTimelineOnUpdate(true)
    setEditTreasureVisibility("public")
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

  async function handleEditUrlBlur() {
    const targetUrl = editUrl.trim()

    if (!targetUrl || editTitle.trim()) {
      return
    }

    setFetchingEditTitle(true)

    const pageTitle = await getPageTitle(targetUrl)

    if (pageTitle) {
      setEditTitle(pageTitle)
    }

    setFetchingEditTitle(false)
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
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            url: targetUrl.trim(),
          }),
        }
      )

      if (!response.ok) {
        return null
      }

      const data =
        await response.json()

      return (
        data.thumbnailUrl ||
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

  async function saveTreasure(
    treasureId: string
  ) {
    const trimmedUrl = editUrl.trim()
    let treasureTitle = editTitle.trim()

    if (!treasureTitle && trimmedUrl) {
      setSavingEdit(true)

      const pageTitle =
        await getPageTitle(trimmedUrl)

      treasureTitle =
        pageTitle || trimmedUrl
    }

    if (!treasureTitle) {
      alert(
        "タイトルを入力するか、URLを入力してください"
      )

      return
    }

    setSavingEdit(true)

    const now =
      new Date().toISOString()

    const thumbnailUrl =
      await getThumbnailUrl(
        trimmedUrl
      )

    const { error } =
      await supabase
        .from("treasures")
        .update({
          title:
            treasureTitle,

          description:
            editDescription.trim() ||
            null,

          url:
            trimmedUrl ||
            null,

          thumbnail_url:
            thumbnailUrl,

          updated_at: now,

          timeline_on_update:
            editTimelineOnUpdate,
        })
        .eq(
          "id",
          treasureId
        )

    if (error) {
      console.error(
        "宝物の更新に失敗:",
        error
      )

      alert(
        `宝物の更新に失敗しました：${error.message}`
      )

      setSavingEdit(false)
      return
    }

    const currentItem = treasureItems.find(
      (item) => item.treasure_id === treasureId
    )

    if (currentItem) {
      const { error: visibilityError } = await supabase
        .from("treasure_box_items")
        .update({
          visibility: editTreasureVisibility,
        })
        .eq("id", currentItem.id)

      if (visibilityError) {
        console.error(
          "宝物の公開範囲更新に失敗:",
          visibilityError
        )

        alert(
          `宝物の公開範囲更新に失敗しました：${visibilityError.message}`
        )

        setSavingEdit(false)
        return
      }

      setTreasureItems((current) =>
        current.map((item) =>
          item.id === currentItem.id
            ? {
                ...item,
                visibility: editTreasureVisibility,
              }
            : item
        )
      )
    }

    setTreasures((current) =>
      current
        .map((treasure) =>
          treasure.id === treasureId
            ? {
                ...treasure,

                title:
                  treasureTitle,

                description:
                  editDescription.trim() ||
                  null,

                url:
                  trimmedUrl ||
                  null,

                thumbnail_url:
                  thumbnailUrl,

                updated_at: now,

                timeline_on_update:
                  editTimelineOnUpdate,
              }
            : treasure
        )
        .sort(
          (a, b) =>
            new Date(
              b.updated_at
            ).getTime() -
            new Date(
              a.updated_at
            ).getTime()
        )
    )

    setSavingEdit(false)
    cancelEditTreasure()
  }

  function formatDate(
    dateString: string
  ) {
    const date = new Date(
      dateString
    )

    return `${date.getFullYear()}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")}/${String(
      date.getDate()
    ).padStart(2, "0")}`
  }

  function isXUrl(
    url: string
  ) {
    try {
      const parsedUrl =
        new URL(url)

      const hostname =
        parsedUrl.hostname
          .toLowerCase()
          .replace(/^www\./, "")

      return (
        hostname === "x.com" ||
        hostname === "twitter.com" ||
        hostname === "mobile.twitter.com"
      )
    } catch {
      return false
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf0] px-4 py-8 text-gray-800 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">

          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm sm:mt-12 sm:p-10">
            <div className="text-5xl">
              🎁
            </div>

            <p className="mt-4 text-gray-500">
              宝箱を開けています...
            </p>
          </div>
        </div>
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-[#fffaf0] px-4 py-8 text-gray-800 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">

          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm sm:mt-12 sm:p-10">
            <div className="text-5xl">
              ⚠️
            </div>

            <h1 className="mt-4 text-xl font-bold sm:text-2xl">
              宝箱を開けられませんでした
            </h1>

            <p className="mt-4 break-words text-sm leading-6 text-gray-500">
              {errorMessage}
            </p>

            <a
              href="/boxes"
              className="mt-8 inline-block rounded-full bg-[#FFB770] px-6 py-3 font-bold text-white hover:bg-[#FD9465]"
            >
              宝箱一覧に戻る
            </a>
          </div>
        </div>
      </main>
    )
  }

  if (!box) {
    return (
      <main className="min-h-screen bg-[#fffaf0] px-4 py-8 text-gray-800 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">

          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm sm:mt-12 sm:p-10">
            <div className="text-5xl">
              😢
            </div>

            <p className="mt-4 font-bold">
              宝箱が見つかりませんでした。
            </p>
          </div>
        </div>
      </main>
    )
  }

  const isOwner =
    Boolean(
      myUsername &&
      box.username?.toLowerCase() ===
        myUsername.toLowerCase()
    )

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const filteredTreasures = treasures.filter((treasure) => {
    const matchesSearch =
      !normalizedSearchQuery ||
      treasure.title.toLowerCase().includes(normalizedSearchQuery) ||
      (treasure.description ?? "")
        .toLowerCase()
        .includes(normalizedSearchQuery)

    const treasureItem = treasureItems.find(
      (item) => item.treasure_id === treasure.id,
    )
    const currentStatusId = treasureItem?.status_id ?? ""
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "none" && !currentStatusId) ||
      currentStatusId === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <main className="min-h-screen bg-[#fffaf0] px-4 pt-8 pb-28 text-gray-800 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex justify-end">
          <SiteMenu />
        </div>

        {/* 宝箱ヘッダー */}
        <div className="mt-8 rounded-3xl bg-white p-5 shadow-sm sm:mt-10 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="min-w-0 flex-1 break-words text-2xl font-bold sm:text-4xl">
                  {box.name}
                </h1>

                <span className="relative top-0.5 shrink-0 text-[#92C3E5]">
                  <VisibilityIcon
                    visibility={box.visibility}
                  />
                </span>

                {isOwner && (
                  <button
                    type="button"
                    onClick={openEdit}
                    aria-label="宝箱を編集"
                    title="宝箱を編集"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#FFB770] transition hover:bg-orange-50 hover:text-[#FD9465]"
                  >
                    <span
                      aria-hidden="true"
                      className="text-xl leading-none"
                    >
                      ✎
                    </span>
                  </button>
                )}
              </div>

              {box.description && (
                <p className="mt-3 break-words text-sm leading-6 text-gray-500 sm:text-base sm:leading-7">
                  {box.description}
                </p>
              )}

              {!isOwner && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleBoxFavorite}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition sm:text-sm ${
                      isBoxFavorite
                        ? "bg-[#FFB770] text-white hover:bg-[#FD9465]"
                        : "border border-[#FFB770] bg-white text-[#FFB770] hover:bg-orange-50"
                    }`}
                  >
                    {isBoxFavorite
                      ? "⭐ お気に入り中"
                      : "⭐ お気に入り"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {editing && isOwner && (
          <section className="mt-6 rounded-3xl border border-[#FFB770] bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#FFB770] sm:text-2xl">
                  宝箱を編集
                </h2>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={
                  savingBox || statusSaving
                }
                className="shrink-0 text-xs font-bold text-gray-400 hover:text-gray-600 sm:text-sm"
              >
                × キャンセル
              </button>
            </div>

            <div className="mt-8 space-y-5">

              <div>
                <label className="mb-2 block font-bold">
                  宝箱の名前
                </label>

                <input
                  type="text"
                  value={editName}
                  onChange={(e) =>
                    setEditName(e.target.value)
                  }
                  className="w-full rounded-2xl border border-[#FFB770] bg-orange-50/30 px-4 py-3 outline-none focus:border-[#FFB770]"
                />
              </div>

              <div>
                <label className="mb-2 block font-bold">
                  説明
                </label>

                <textarea
                  value={editBoxDescription}
                  onChange={(e) =>
                    setEditBoxDescription(
                      e.target.value
                    )
                  }
                  rows={4}
                  placeholder="説明を書かなくてもOK"
                  className="w-full resize-none rounded-2xl border border-[#FFB770] bg-orange-50/30 px-4 py-3 outline-none focus:border-[#FFB770]"
                />
              </div>

              <div className="rounded-2xl bg-orange-50 p-4">
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
                      label: "秘密の宝箱",
                      icon: "diamond",
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setEditVisibility(option.value)
                      }
                      className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-bold text-black transition ${
                        editVisibility === option.value
                          ? "border-[#FFB770] bg-white shadow-sm"
                          : "border-transparent bg-white/60 hover:bg-white"
                      }`}
                    >
                      <span className="text-gray-600">
                        <Icon name={option.icon} size={22} />
                      </span>
                      {option.label}
                    </button>
                  ))}
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  秘密の宝箱は、今は通常の公開一覧には表示されません。
                </p>

                {editVisibility === "friends" && (
                  <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                    {loadingFollowing ? (
                      <p className="mt-4 text-sm text-gray-400">
                        フォロー中のユーザーを読み込み中...
                      </p>
                    ) : followingUsers.length === 0 ? (
                      <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-gray-500">
                        まだ誰もフォローしていません。
                        <br />
                        先にフォローしてから秘密の宝箱を設定してください。

                        <a
                          href="/following"
                          className="mt-3 inline-block font-bold text-[#FFB770] hover:text-[#FD9465]"
                        >
                          フォローする →
                        </a>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        {followingUsers.map((followUser) => {
                          const checked =
                            selectedSecretUsers.includes(
                              followUser.username
                            )

                          return (
                            <label
                              key={followUser.username}
                              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                                checked
                                  ? "border-[#FFB770] bg-white"
                                  : "border-orange-100 bg-white/70 hover:bg-white"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSecretUsers(
                                      (current) => [
                                        ...current,
                                        followUser.username,
                                      ]
                                    )
                                  } else {
                                    setSelectedSecretUsers(
                                      (current) =>
                                        current.filter(
                                          (username) =>
                                            username !==
                                            followUser.username
                                        )
                                    )
                                  }
                                }}
                                className="h-5 w-5 shrink-0 accent-[#FFB770]"
                              />

                              <span className="min-w-0 truncate text-sm font-bold">
                                @{followUser.username}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={saveBox}
                disabled={savingBox}
                className="w-full rounded-full bg-[#FFB770] px-6 py-4 font-bold text-white shadow-md transition hover:bg-[#FD9465] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingBox
                  ? "保存中..."
                  : "変更を保存する"}
              </button>

              <button
                type="button"
                onClick={deleteBox}
                disabled={savingBox || statusSaving}
                className="w-full rounded-full border border-red-200 bg-white px-6 py-4 font-bold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                この宝箱を削除する
              </button>
            </div>

            <div className="mt-10 border-t border-[#FFB770] pt-8">
              <div>
                <h3 className="text-xl font-bold">
                  ステータス
                </h3>
              </div>

              {statuses.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {statuses.map((status) => {
                    const isEditing =
                      editingStatusId ===
                      status.id

                    return (
                      <div
                        key={status.id}
                        className="rounded-2xl bg-orange-50 p-4"
                      >
                        {isEditing ? (
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="min-w-0 flex-1">
                              <input
                                type="text"
                                value={
                                  editingStatusName
                                }
                                onChange={(e) =>
                                  setEditingStatusName(
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (
                                    e.key ===
                                    "Enter"
                                  ) {
                                    e.preventDefault()

                                    saveStatus(
                                      status.id
                                    )
                                  }
                                }}
                                autoFocus
                                className="w-full rounded-2xl border border-[#FFB770] bg-white px-4 py-3 outline-none focus:border-[#FFB770]"
                              />
                            </div>

                            <div className="flex items-center gap-2 rounded-2xl border border-[#FFB770] bg-white px-3 py-2">
                              <input
                                type="color"
                                value={editingStatusColor}
                                onChange={(e) =>
                                  setEditingStatusColor(
                                    e.target.value
                                  )
                                }
                                disabled={statusSaving}
                                className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="ステータスの色"
                              />
                              <span className="text-xs font-bold text-gray-500">
                                {editingStatusColor}
                              </span>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  saveStatus(
                                    status.id
                                  )
                                }
                                disabled={
                                  statusSaving
                                }
                                className="rounded-full bg-[#FFB770] px-4 py-2 text-sm font-bold text-white hover:bg-[#FD9465] disabled:opacity-50"
                              >
                                保存
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStatusId(
                                    null
                                  )
                                  setEditingStatusName(
                                    ""
                                  )
                                  setEditingStatusColor("#f3f4f6")
                                }}
                                disabled={
                                  statusSaving
                                }
                                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <span
                              className="min-w-0 flex-1 rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap sm:text-base"
                              style={{
                                backgroundColor:
                                  status.color || "#f3f4f6",
                              }}
                            >
                              {status.name}
                            </span>

                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  moveStatus(
                                    status.id,
                                    "up"
                                  )
                                }
                                disabled={
                                  statusSaving ||
                                  statuses.findIndex(
                                    (item) =>
                                      item.id ===
                                      status.id
                                  ) === 0
                                }
                                className="rounded-full bg-white px-3 py-2 text-sm font-bold text-[#FFB770] hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label="上へ移動"
                              >
                                ↑
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  moveStatus(
                                    status.id,
                                    "down"
                                  )
                                }
                                disabled={
                                  statusSaving ||
                                  statuses.findIndex(
                                    (item) =>
                                      item.id ===
                                      status.id
                                  ) ===
                                    statuses.length - 1
                                }
                                className="rounded-full bg-white px-3 py-2 text-sm font-bold text-[#FFB770] hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label="下へ移動"
                              >
                                ↓
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  startEditStatus(
                                    status
                                  )
                              }
                              disabled={
                                statusSaving
                              }
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-400 hover:bg-orange-50 hover:text-[#FFB770] disabled:opacity-50"
                              aria-label="名前変更"
                                  title="名前変更"
                                >
                                  <PenIcon size={19} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteStatus(
                                      status
                                    )
                              }
                              disabled={
                                statusSaving
                              }
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-400 hover:bg-red-50 hover:text-red-400 disabled:opacity-50"
                              aria-label="削除"
                                  title="削除"
                                >
                                  <TrashIcon size={19} />
                                </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-[#FFB770] p-5 text-center text-sm text-gray-400">
                  まだステータスがありません。
                </div>
              )}

              <div className="mt-5 rounded-2xl bg-orange-50/70 p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                  <div className="min-w-0">
                    <input
                      type="text"
                      value={newStatus}
                      onChange={(e) =>
                        setNewStatus(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addStatus()
                        }
                      }}
                      placeholder="例：あとで買う"
                      className="w-full rounded-2xl border border-[#FFB770] bg-white px-4 py-3 outline-none focus:border-[#FFB770]"
                    />
                  </div>

                  <div className="shrink-0">
                    <div className="flex h-[50px] items-center rounded-2xl border border-[#FFB770] bg-white px-2">
                      <input
                        type="color"
                        value={newStatusColor}
                        onChange={(e) =>
                          setNewStatusColor(e.target.value)
                        }
                        disabled={statusSaving}
                        className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="ステータスの色"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addStatus}
                    disabled={statusSaving}
                    className="col-span-2 w-full rounded-2xl bg-orange-100 px-5 py-3 font-bold text-[#FFB770] hover:bg-orange-200 disabled:opacity-50"
                  >
                    ＋ステータスを追加
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 宝箱の中身 */}
        <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm sm:mt-8 sm:p-8">
          {/* 見出し */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <h2 className="text-sm font-bold tracking-widest text-[#FFB770]">
                TREASURE
              </h2>

              <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-[#FFB770]">
                {normalizedSearchQuery
                  ? `${filteredTreasures.length}/${treasures.length}個`
                  : `${treasures.length}個`}
              </span>
            </div>

            {isOwner && (
              <a
                href={`/treasures?box=${boxId}`}
                aria-label="宝物を追加する"
                title="宝物を追加する"
                className="flex h-12 w-12 shrink-0 items-center justify-center text-[#FFB770] transition hover:text-[#FD9465]"
              >
                <Icon
                  name="plus2"
                  size={26}
                />
              </a>
            )}
          </div>

          <div className="mt-5">
            <label htmlFor="treasure-search" className="sr-only">
              宝物を検索
            </label>

            <div className="relative">
              <input
                id="treasure-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="宝物名・メモを検索"
                className="w-full rounded-2xl border border-[#FFB770] bg-orange-50/30 px-4 py-3 pr-11 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#FFB770] focus:bg-white sm:text-base"
              />

              <span
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#FFB770]"
                aria-hidden="true"
              >
                <Icon
                  name="search"
                  size={26}
                />
              </span>
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="treasure-status-filter" className="mb-2 block text-sm font-bold text-gray-600">
              ステータスで絞り込み
            </label>
            <select
              id="treasure-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-2xl border border-[#FFB770] bg-white px-4 py-3 text-base text-gray-700 outline-none focus:border-[#FFB770] sm:max-w-sm"
            >
              <option value="all">すべて</option>
              <option value="none">ステータスなし</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>

          {treasures.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-[#FFB770] p-6 text-center sm:mt-8 sm:p-12">
              <p className="text-base font-bold text-[#FFB770] sm:text-lg">
                NO TREASURE
              </p>
            </div>
          ) : filteredTreasures.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-[#FFB770] p-6 text-center sm:mt-8 sm:p-12">
              <div className="text-5xl sm:text-6xl">
                🔎
              </div>

              <p className="mt-5 text-base font-bold sm:text-lg">
                「{searchQuery.trim()}」に一致する宝物がありません。
              </p>

              <p className="mt-2 text-sm text-gray-500">
                宝物名やメモに含まれる言葉で検索できます。
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4 sm:mt-8 sm:space-y-6">
              {filteredTreasures.map(
                (treasure) => {
                  const item =
                    treasureItems.find(
                      (item) =>
                        item.treasure_id ===
                        treasure.id
                    )

                  const isFavorite =
                    favoriteTreasureIds.includes(
                      treasure.id
                    )

                  const currentStatusId =
                    item?.status_id ?? ""

                  const currentStatus =
                    statuses.find(
                      (status) =>
                        status.id ===
                        currentStatusId
                    )

                  const isEditing =
                    editingTreasureId ===
                    treasure.id

                  const xPost =
                    treasure.url &&
                    isXUrl(treasure.url)

                  return (
                    <div
                      key={treasure.id}
                      className="min-w-0 rounded-3xl border border-[#FFB770] bg-white p-4 transition hover:shadow-md sm:p-6"
                    >
                      {!isEditing ? (
                        <>
                          {/* 宝物情報 */}
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-col items-start gap-2">
                              <h3 className="min-w-0 max-w-full break-words text-base font-bold sm:text-xl">
                                {treasure.title}
                              </h3>

                              <div className="flex flex-wrap items-center gap-2">
                                <span className="shrink-0 text-xs text-gray-400 sm:text-sm">
                                  {formatDate(treasure.updated_at)}
                                </span>
                                <TreasureNotesRating treasureId={treasure.id} mode="rating" />
                              </div>

                              {statuses.length >
                                0 &&
                                item &&
                                (isOwner ? (
                                  <div
                                    className="min-w-0 shrink rounded-full px-1 py-0.5"
                                    style={{
                                      backgroundColor:
                                        currentStatus?.color ??
                                        "#f3f4f6",
                                    }}
                                  >
                                    <select
                                      value={
                                        currentStatusId
                                      }
                                      onChange={(
                                        e
                                      ) =>
                                        changeStatus(
                                          item.id,
                                          treasure.id,
                                          e.target.value
                                        )
                                      }
                                      className="max-w-[95px] rounded-full border-0 bg-transparent px-1.5 py-1 text-xs font-bold text-gray-700 outline-none sm:max-w-[140px] sm:px-3 sm:text-sm"
                                    >
                                      <option value="">
                                        状態なし
                                      </option>

                                      {statuses.map(
                                        (
                                          status
                                        ) => (
                                          <option
                                            key={
                                              status.id
                                            }
                                            value={
                                              status.id
                                            }
                                          >
                                            {
                                              status.name
                                            }
                                          </option>
                                        )
                                      )}
                                    </select>
                                  </div>
                                ) : (
                                  <span
                                    className="max-w-[140px] shrink rounded-full px-2 py-1 text-xs font-bold text-gray-700 sm:px-3 sm:text-sm"
                                    style={{
                                      backgroundColor:
                                        currentStatus?.color ??
                                        "#f3f4f6",
                                    }}
                                  >
                                    {currentStatus?.name ??
                                      "状態なし"}
                                  </span>
                                ))}
                            </div>

                          {treasure.description && (
                            <p className="mt-3 break-words text-sm leading-6 text-gray-700 sm:mt-4 sm:text-base sm:leading-7">
                              {treasure.description}
                            </p>
                          )}

                          {/* URLと画像 */}
                          {treasure.url && !treasure.thumbnail_url && (
                            <a href={treasure.url} target="_blank" rel="noopener noreferrer"
                              className="mt-3 block break-all text-xs text-[#D97722] underline underline-offset-2 sm:text-sm">
                              {treasure.url}
                            </a>
                          )}
                          {xPost && <div className="mt-3"><XPost url={treasure.url!} /></div>}
                          {!xPost && treasure.thumbnail_url && treasure.url && (
                            <a href={treasure.url} target="_blank" rel="noopener noreferrer"
                              className={`mt-3 block overflow-hidden rounded-2xl sm:mt-4 ${treasure.url.toLowerCase().includes("cmoa.jp") ? "flex justify-center bg-white" : "bg-orange-50"}`}>
                              <img src={treasure.thumbnail_url} alt="" className={treasure.url.toLowerCase().includes("cmoa.jp") ? "h-64 w-auto max-w-full object-contain sm:h-80" : "h-auto max-h-72 w-full object-cover sm:max-h-96"} loading="lazy" />
                            </a>
                          )}
                          </div>

                          {/* 操作ボタン */}
                          <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-orange-50 pt-2 sm:mt-4 sm:gap-2 sm:pt-3">
                            <TreasureNotesRating treasureId={treasure.id} mode="notes" />
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() =>
                                  startEditTreasure(
                                    treasure
                                  )
                                }
                                title="編集"
                                className="flex h-9 w-9 items-center justify-center text-xl text-gray-400 transition hover:text-[#FFB770] sm:h-10 sm:w-10 sm:text-2xl"
                              >
                                ✎
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                toggleFavorite(
                                  treasure.id
                                )
                              }
                              title={
                                isFavorite
                                  ? "お気に入り解除"
                                  : "お気に入り"
                              }
                              className={`flex h-9 w-9 items-center justify-center text-xl transition sm:h-10 sm:w-10 sm:text-2xl ${
                                isFavorite
                                  ? "text-pink-500"
                                  : "text-gray-400 hover:text-pink-400"
                              }`}
                            >
                              {isFavorite
                                ? "♥"
                                : "♡"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openSaveTreasure(
                                  treasure.id
                                )
                              }
                              title={
                                (treasureSaves[treasure.id] ?? []).length > 0
                                  ? "保存済み"
                                  : "自分の宝箱に保存"
                              }
                              className={`flex h-9 w-9 items-center justify-center rounded-full text-xl transition sm:h-10 sm:w-10 sm:text-2xl ${(treasureSaves[treasure.id] ?? []).length > 0 ? "bg-orange-50 text-[#FFB770]" : "text-gray-400 hover:text-[#FFB770]"}`}
                            >
                              <svg
                                width="23"
                                height="23"
                                viewBox="0 0 24 24"
                                fill={
                                  (treasureSaves[treasure.id] ?? []).length > 0
                                    ? "currentColor"
                                    : "none"
                                }
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3.8L6 21V4.5Z" />
                              </svg>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-base font-bold text-[#FFB770] sm:text-lg">
                              宝物を編集
                            </h3>

                            <button
                              type="button"
                              onClick={
                                cancelEditTreasure
                              }
                              className="shrink-0 text-xs font-bold text-gray-400 hover:text-gray-600 sm:text-sm"
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
                                className="w-full rounded-2xl border border-[#FFB770] bg-orange-50/30 px-4 py-3 outline-none focus:border-[#FFB770]"
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
                                rows={3}
                                style={{ minHeight: "6.5rem" }}
                                className="w-full resize-none rounded-2xl border border-[#FFB770] bg-orange-50/30 px-4 py-3 leading-6 outline-none focus:border-[#FFB770]"
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
                                onBlur={handleEditUrlBlur}
                                placeholder="https://..."
                                className="w-full rounded-2xl border border-[#FFB770] bg-orange-50/30 px-4 py-3 outline-none focus:border-[#FFB770]"
                              />

                              <p className="mt-2 text-xs leading-5 text-gray-400">
                                タイトルが空欄なら、URLからページタイトルを自動取得します。
                              </p>

                              {fetchingEditTitle && (
                                <p className="mt-2 text-xs text-[#FFB770]">
                                  ページタイトルを取得しています...
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-bold">評価</label>
                              <div className="flex items-center gap-2" role="group" aria-label="評価を選択">
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <button
                                    key={value}
                                    type="button"
                                    aria-label={`${value}つ星`}
                                    aria-pressed={editRating === value}
                                    onClick={() => setEditRating(editRating === value ? 0 : value)}
                                    className={`text-3xl transition ${editRating >= value ? "text-amber-400" : "text-gray-300"}`}
                                  >★</button>
                                ))}
                                {editRating > 0 && (
                                  <button type="button" onClick={() => setEditRating(0)} className="ml-2 text-xs text-gray-400 underline">クリア</button>
                                )}
                              </div>
                            </div>

                            <div className="rounded-2xl bg-orange-50 p-4">
                              <p className="mb-3 text-sm font-bold">
                                宝物の公開範囲
                              </p>

                              <div className="grid gap-2 sm:grid-cols-3">
                                {[
                                  {
                                    value: "public" as const,
                                    label: "公開",
                                  },
                                  {
                                    value: "private" as const,
                                    label: "非公開",
                                  },
                                  {
                                    value: "friends" as const,
                                    label: "秘宝",
                                  },
                                ].map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                      setEditTreasureVisibility(option.value)
                                    }
                                    className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-bold text-gray-900 transition ${
                                      editTreasureVisibility === option.value
                                        ? "border-orange-300 bg-white shadow-sm"
                                        : "border-transparent bg-white/60 hover:bg-white"
                                    }`}
                                  >
                                    <span className="text-gray-600">
                                      <Icon
                                        name={
                                          option.value === "private"
                                            ? "key"
                                            : option.value === "friends"
                                              ? "diamond"
                                              : "world"
                                        }
                                        size={20}
                                      />
                                    </span>
                                    {option.label}
                                  </button>
                                ))}
                              </div>

                              <p className="mt-2 text-xs text-gray-500">
                                「秘宝」は特別な友達が見られる宝物です。
                              </p>
                            </div>

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
                                    setEditTimelineOnUpdate((current) => !current)
                                  }
                                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                                    editTimelineOnUpdate
                                      ? "bg-[#FFB770]"
                                      : "bg-gray-300"
                                  }`}
                                  aria-label="タイムライン再投稿切り替え"
                                  aria-pressed={editTimelineOnUpdate}
                                >
                                  <span
                                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                                      editTimelineOnUpdate ? "left-6" : "left-1"
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                saveTreasure(
                                  treasure.id
                                )
                              }
                              disabled={
                                savingEdit
                              }
                              className="w-full rounded-full bg-[#FFB770] px-6 py-4 text-sm font-bold text-white shadow-md hover:bg-[#FD9465] disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
                            >
                              {savingEdit
                                ? "タイトル・サムネイルを確認して保存中..."
                                : "宝物を上書き保存する"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteTreasure(
                                  treasure.id,
                                  treasure.title
                                )
                              }
                              disabled={savingEdit}
                              className="w-full rounded-full border border-red-200 bg-white px-6 py-4 text-sm font-bold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
                            >
                              この宝物を削除する
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }
              )}
            </div>
          )}
        </section>

        {selectedSaveTreasureId && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
            <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold tracking-widest text-[#FFB770]">
                    SAVE TREASURE
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    宝箱に保存
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSaveTreasureId(null)}
                  disabled={savingToBox}
                  className="rounded-full bg-gray-100 px-4 py-2 text-xl text-gray-400 hover:bg-gray-200 disabled:opacity-50"
                  aria-label="閉じる"
                >
                  ×
                </button>
              </div>

              <p className="mt-2 text-sm text-gray-500">
                コピーを作って、自分の宝箱に保存します。
              </p>

              {myBoxes.length === 0 ? (
                <div className="mt-5 rounded-2xl bg-orange-50 p-5 text-center">
                  <p className="font-bold">まだ自分の宝箱がありません。</p>
                  <a
                    href="/create"
                    className="mt-4 inline-block rounded-full bg-[#FFB770] px-5 py-2.5 font-bold text-white"
                  >
                    宝箱をつくる
                  </a>
                </div>
              ) : (
                <div className="mt-5 space-y-2">
                  {myBoxes.map((targetBox) => {
                    const save = (treasureSaves[selectedSaveTreasureId] ?? []).find(
                      (item) => item.box_id === targetBox.id
                    )

                    return (
                      <div
                        key={targetBox.id}
                        className="flex items-center gap-2 rounded-2xl border border-[#FFB770] bg-orange-50/40 p-3"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            copyTreasureToMyBox(targetBox.id)
                          }
                          disabled={savingToBox || Boolean(save)}
                          className="min-w-0 flex-1 rounded-xl px-3 py-2 text-left hover:bg-orange-50 disabled:opacity-60"
                        >
                          <p className="truncate font-bold">{targetBox.name}</p>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                            <span className="text-gray-600">
                              <Icon
                                name={
                                  targetBox.visibility === "friends"
                                    ? "diamond"
                                    : targetBox.visibility === "private"
                                      ? "key"
                                      : "world"
                                }
                                size={16}
                              />
                            </span>
                            <span>
                              {targetBox.visibility === "friends"
                                ? "秘密の宝箱"
                                : targetBox.visibility === "private"
                                  ? "非公開"
                                  : "公開"}
                            </span>
                          </div>
                        </button>

                        {save && (
                          <button
                            type="button"
                            onClick={() =>
                              removeTreasureSave(
                                selectedSaveTreasureId,
                                save
                              )
                            }
                            disabled={savingToBox}
                            className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-bold text-[#FFB770] hover:bg-orange-100 disabled:opacity-50"
                          >
                            解除
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}