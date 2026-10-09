"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import SiteMenu from "@/app/components/SiteMenu"
import XPost from "@/app/components/XPost"

type Treasure = {
  id: string
  title: string
  url: string | null
  thumbnail_url: string | null
  description: string | null
  created_at: string
  updated_at: string
}

type TreasureItem = {
  id: string
  treasure_id: string
  box_id: string
  status_id: string | null
  visibility: "box" | "public" | "private" | "friends" | null
}

type TreasureBox = {
  id: string
  name: string
  username: string | null
  visibility: "public" | "private" | "friends" | null
}

type BoxStatus = {
  id: string
  name: string
  color: string | null
}

type FavoriteItem = {
  treasure: Treasure
  box: TreasureBox | null
  item: TreasureItem | null
  status: BoxStatus | null
  favoriteCreatedAt: string
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

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteItem[]>([])
  const [myUsername, setMyUsername] = useState("")
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  const [savedTreasureIds, setSavedTreasureIds] =
    useState<string[]>([])

  useEffect(() => {
    async function loadFavorites() {
      setLoading(true)
      setErrorMessage("")

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setMyUsername("")
        setItems([])
        setLoading(false)
        return
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        console.error(
          "ユーザー情報の取得に失敗:",
          profileError
        )

        setErrorMessage(
          "ユーザー情報を取得できませんでした。"
        )

        setLoading(false)
        return
      }

      const username =
        profile?.username?.trim().toLowerCase() ?? ""

      setMyUsername(username)

      if (!username) {
        setItems([])
        setLoading(false)
        return
      }

      // ----------------------------
      // お気に入り
      // ----------------------------

      const {
        data: favoriteData,
        error: favoriteError,
      } = await supabase
        .from("treasure_favorites")
        .select("treasure_id, created_at")
        .eq("username", username)
        .order("created_at", {
          ascending: false,
        })

      if (favoriteError) {
        console.error(
          "お気に入りの取得に失敗:",
          favoriteError
        )

        setErrorMessage(
          `お気に入りの取得に失敗しました：${favoriteError.message}`
        )

        setLoading(false)
        return
      }

      const favorites = favoriteData ?? []

      if (favorites.length === 0) {
        setItems([])
        setSavedTreasureIds([])
        setLoading(false)
        return
      }

      const treasureIds =
        favorites.map(
          (item) => item.treasure_id
        )

      // ----------------------------
      // 宝物
      // ----------------------------

      const {
        data: treasureData,
        error: treasureError,
      } = await supabase
        .from("treasures")
        .select(
          "id, title, url, thumbnail_url, description, created_at, updated_at"
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

      // ----------------------------
      // 宝箱所属
      // ----------------------------

      const {
        data: itemData,
        error: itemError,
      } = await supabase
        .from("treasure_box_items")
        .select(
          "id, treasure_id, box_id, status_id, visibility"
        )
        .in("treasure_id", treasureIds)

      if (itemError) {
        console.error(
          "宝物の所属情報の取得に失敗:",
          itemError
        )
      }

      const boxIds = [
        ...new Set(
          (itemData ?? []).map(
            (item) => item.box_id
          )
        ),
      ]

      // ----------------------------
      // 宝箱
      // ----------------------------

      let boxData: TreasureBox[] = []

      if (boxIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("treasure_boxes")
          .select(
            "id, name, username, visibility"
          )
          .in("id", boxIds)

        if (error) {
          console.error(
            "宝箱の取得に失敗:",
            error
          )
        } else {
          boxData = data ?? []
        }
      }

      // ----------------------------
      // ステータス
      // ----------------------------

      const statusIds = [
        ...new Set(
          (itemData ?? [])
            .map(
              (item) =>
                item.status_id
            )
            .filter(
              (id): id is string =>
                Boolean(id)
            )
        ),
      ]

      let statusData: BoxStatus[] = []

      if (statusIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("box_statuses")
          .select(
            "id, name, color"
          )
          .in(
            "id",
            statusIds
          )

        if (error) {
          console.error(
            "ステータスの取得に失敗:",
            error
          )
        } else {
          statusData = data ?? []
        }
      }

      // ----------------------------
      // 保存済み宝物
      // ----------------------------

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

      // ----------------------------
      // Map
      // ----------------------------

      const treasureMap = new Map(
        (treasureData ?? []).map(
          (treasure) => [
            treasure.id,
            treasure,
          ]
        )
      )

      const itemMap =
        new Map<string, TreasureItem>()

      for (const item of itemData ?? []) {
        if (
          !itemMap.has(
            item.treasure_id
          )
        ) {
          itemMap.set(
            item.treasure_id,
            item
          )
        }
      }

      const boxMap = new Map(
        boxData.map(
          (box) => [
            box.id,
            box,
          ]
        )
      )

      const statusMap = new Map(
        statusData.map(
          (status) => [
            status.id,
            status,
          ]
        )
      )

      // ----------------------------
      // 表示データ
      // ----------------------------

      const favoriteItems: FavoriteItem[] = []

      for (const favorite of favorites) {
        const treasure =
          treasureMap.get(
            favorite.treasure_id
          )

        if (!treasure) {
          continue
        }

        const item =
          itemMap.get(
            favorite.treasure_id
          )

        favoriteItems.push({
          treasure,
          box: item
            ? boxMap.get(
                item.box_id
              ) ?? null
            : null,
          item: item ?? null,
          status: item?.status_id
            ? statusMap.get(
                item.status_id
              ) ?? null
            : null,
          favoriteCreatedAt:
            favorite.created_at,
        })
      }

      setItems(favoriteItems)
      setLoading(false)
    }

    loadFavorites()
  }, [])

  // ----------------------------
  // お気に入り解除
  // ----------------------------

  async function toggleFavorite(
    treasureId: string
  ) {
    if (!myUsername) {
      return
    }

    const {
      error,
    } = await supabase
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

    setItems(
      (current) =>
        current.filter(
          (item) =>
            item.treasure.id !==
            treasureId
        )
    )
  }

  // ----------------------------
  // 日付
  // ----------------------------

  function formatDate(
    dateString: string
  ) {
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

  // ----------------------------
  // NEW判定
  // ----------------------------

  function isNew(
    dateString: string
  ) {
    const diff =
      Date.now() -
      new Date(
        dateString
      ).getTime()

    return (
      diff >= 0 &&
      diff <=
        1000 *
          60 *
          60 *
          24 *
          3
    )
  }

  // ----------------------------
  // 公開設定アイコン
  // ----------------------------

  function getVisibilityIcon(
    visibility:
      | string
      | null
      | undefined
  ) {
    if (
      visibility ===
      "private"
    ) {
      return "key"
    }

    if (
      visibility ===
      "friends"
    ) {
      return "diamond"
    }

    return "world"
  }

  // ----------------------------
  // ローディング
  // ----------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf0] px-4 pb-32 pt-10 text-gray-800 sm:px-6 sm:pb-16 sm:pt-12">
        <div className="mx-auto max-w-3xl">

          <div className="flex justify-end">
            <SiteMenu />
          </div>

          <div className="mt-10 rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">
              お気に入りを読み込み中...
            </p>
          </div>

        </div>
      </main>
    )
  }

  // ----------------------------
  // 未ログイン
  // ----------------------------

  if (!myUsername) {
    return (
      <main className="min-h-screen bg-[#fffaf0] px-4 pb-32 pt-10 text-gray-800 sm:px-6 sm:pb-16 sm:pt-12">
        <div className="mx-auto max-w-3xl">

          <div className="flex justify-end">
            <SiteMenu />
          </div>

          <div className="mt-8">
            <p className="text-sm font-bold tracking-widest text-[#FFB770]">
              FAVORITES
            </p>
          </div>

          <div className="mt-10 rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">

            <div className="text-5xl">
              ♡
            </div>

            <h1 className="mt-4 text-xl font-bold sm:text-2xl">
              お気に入りを見るにはログインしてください
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              ログインすると、♡をつけた宝物をここで見られます。
            </p>

          </div>

        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] px-4 pb-32 pt-10 text-gray-800 sm:px-6 sm:pb-16 sm:pt-12">
      <div className="mx-auto max-w-3xl">

        {/* MENU */}

        <div className="flex justify-end">
          <SiteMenu />
        </div>

        {/* ページタイトル */}

        {/* エラー */}

        {errorMessage && (
          <div className="mt-10 rounded-2xl bg-white p-5 text-sm text-red-500 shadow-sm">
            {errorMessage}
          </div>
        )}

        {/* 空表示 */}

        {!errorMessage &&
          items.length === 0 && (
            <div className="mt-10 rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">

              <h2 className="text-xl font-bold">
                まだお気に入りの宝物はありません。
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                タイムラインや宝箱で♡を押すと、
                <br />
                ここに表示されます。
              </p>

              <a
                href="/timeline"
                className="mt-6 inline-block rounded-full bg-[#FFB770] px-6 py-3 font-bold text-white hover:bg-[#FD9465]"
              >
                タイムラインを見る
              </a>

            </div>
          )}

        {/* 宝物一覧 */}

        {!errorMessage &&
          items.length > 0 && (
            <div className="mt-10 space-y-4">

              {items.map((item) => {
                const treasure =
                  item.treasure

                const visibilityIcon =
                  getVisibilityIcon(
                    item.item
                      ?.visibility
                  )

                const isSaved =
                  savedTreasureIds.includes(
                    treasure.id
                  )

                return (
                  <article
                    key={treasure.id}
                    className="rounded-3xl bg-white px-5 py-5 shadow-sm sm:px-6"
                  >

                    {/* 上段 */}

                    <div className="min-w-0 text-sm">

                      <div className="flex min-w-0 flex-wrap items-center gap-y-2">

                        {item.box && (
                          <a
                            href={`/boxes/${item.box.id}`}
                            className="hover:text-[#FFB770]"
                          >
                            <span className="font-bold text-gray-700">
                              {item.box.name}
                            </span>
                          </a>
                        )}

                        {item.box && (
                          <>
                            <span className="mx-1 text-gray-300 sm:mx-2">
                              ·
                            </span>

                            <span className="text-gray-400">
                              @{item.box.username || "unknown"}
                            </span>
                          </>
                        )}

                        <span className="mx-1 text-gray-300 sm:mx-2">
                          ·
                        </span>

                        <span className="text-gray-400">
                          {formatDate(
                            treasure.updated_at ??
                              treasure.created_at
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

                      {/* ステータス */}

                      {item.status && (
                        <div className="mt-2">
                          <span
                            className="inline-flex rounded-full px-3 py-1 text-xs font-bold"
                            style={{
                              backgroundColor:
                                item.status.color ??
                                "#f3f4f6",
                            }}
                          >
                            {item.status.name}
                          </span>
                        </div>
                      )}

                    </div>

                    {/* 宝物の上の区切り線 */}

                    <div className="mt-3 border-t border-gray-100" />

                    {/* 宝物 */}

                    <div className="mt-4">

                      <p className="text-lg font-bold leading-8 sm:text-xl">
                        {treasure.title}
                      </p>

                      {isNew(
                        treasure.updated_at ??
                          treasure.created_at
                      ) && (
                        <span className="mt-2 inline-block rounded-full bg-[#FFB770] px-2.5 py-1 text-xs font-bold text-white">
                          NEW
                        </span>
                      )}

                      {treasure.thumbnail_url && (
                        <a
                          href={
                            treasure.url ??
                            "#"
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 block overflow-hidden rounded-2xl bg-gray-100"
                        >
                          <img
                            src={
                              treasure.thumbnail_url
                            }
                            alt={
                              treasure.title
                            }
                            className="h-auto max-h-80 w-full object-cover transition hover:opacity-90"
                          />
                        </a>
                      )}

                      {treasure.description && (
                        <p className="mt-3 text-sm leading-6 text-gray-700">
                          {treasure.description}
                        </p>
                      )}

                      {!treasure.thumbnail_url &&
                        treasure.url && (
                          isXPostUrl(
                            treasure.url
                          ) ? (
                            <XPost
                              url={
                                treasure.url
                              }
                            />
                          ) : (
                            <a
                              href={
                                treasure.url
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 block break-all text-sm text-[#FFB770] hover:text-[#FD9465]"
                            >
                              {
                                treasure.url
                              }
                            </a>
                          )
                        )}

                      {/* ♡・しおり */}

                      <div className="mt-3 border-t border-gray-100 pt-2">
                        <div className="flex items-center justify-end gap-2 sm:gap-3">

                          {/* ♡ */}

                          <button
                            type="button"
                            onClick={() =>
                              toggleFavorite(
                                treasure.id
                              )
                            }
                            aria-label="お気に入り解除"
                            title="お気に入り解除"
                            className="flex h-10 w-10 items-center justify-center text-2xl leading-none text-pink-500 transition hover:text-pink-600"
                          >
                            ♥
                          </button>

                          {/* しおり */}

                          {isSaved && (
                            <div
                              className="flex h-10 w-10 items-center justify-center"
                              title="保存済み"
                            >
                              <Bookmark2Icon
                                active={
                                  true
                                }
                              />
                            </div>
                          )}

                        </div>
                      </div>

                    </div>

                  </article>
                )
              })}

            </div>
          )}

      </div>

      {/* 下部固定メニューに重ならないための余白 */}
      <div className="h-20 sm:hidden" />
    </main>
  )
}