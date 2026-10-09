"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import SiteMenu from "@/app/components/SiteMenu"

type Profile = {
  username: string
}

type TreasureBox = {
  id: string
  name: string
  description: string | null
  username: string | null
  is_public: boolean
  visibility: "public" | "private" | "friends" | null
  created_at: string
}

function Icon({
  name,
  size = 24,
  color = "currentColor",
}: {
  name: string
  size?: number
  color?: string
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: "inline-block",
        backgroundColor: color,
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
      color="#92C3E5"
    />
  )
}

export default function FollowingPage() {
  const [myUsername, setMyUsername] = useState<string | null>(null)
  const [followingUsers, setFollowingUsers] = useState<string[]>([])
  const [searchUsername, setSearchUsername] = useState("")
  const [searchResult, setSearchResult] = useState<Profile | null>(null)
  const [searching, setSearching] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  const [favoriteBoxes, setFavoriteBoxes] = useState<TreasureBox[]>([])
  const [followingBoxes, setFollowingBoxes] = useState<TreasureBox[]>([])
  const [favoriteBoxIds, setFavoriteBoxIds] = useState<string[]>([])
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null)
  const [boxLoading, setBoxLoading] = useState(true)

  useEffect(() => {
    async function loadUserAndFollowing() {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        alert("フォロー機能を使うにはログインが必要です")
        setLoading(false)
        setBoxLoading(false)
        return
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle()

      if (profileError || !profile?.username) {
        console.error("ユーザー情報の取得に失敗:", profileError)
        setLoading(false)
        setBoxLoading(false)
        return
      }

      const username = profile.username.trim().toLowerCase()

      setMyUsername(username)

      await loadFollowing(username)
      await loadBoxes(username)

      setLoading(false)
    }

    loadUserAndFollowing()
  }, [])

  async function loadFollowing(username: string) {
    const { data: followData, error: followError } =
      await supabase
        .from("follows")
        .select("following_username")
        .eq("follower_username", username)

    if (followError) {
      console.error("フォロー情報の取得に失敗:", followError)
      setFollowingUsers([])
      return
    }

    const users =
      followData?.map(
        (item) =>
          item.following_username.trim().toLowerCase()
      ) ?? []

    setFollowingUsers(users)
  }

  async function loadBoxes(username: string) {
    setBoxLoading(true)

    // ============================
    // FAVORITE BOXES
    // ============================

    const { data: favoriteData, error: favoriteError } =
      await supabase
        .from("box_favorites")
        .select("box_id")
        .eq("username", username)

    if (favoriteError) {
      console.error(
        "お気に入り宝箱情報の取得に失敗:",
        favoriteError
      )

      setFavoriteBoxIds([])
      setFavoriteBoxes([])
    } else {
      const favoriteIds =
        favoriteData?.map((item) => item.box_id) ?? []

      setFavoriteBoxIds(favoriteIds)

      if (favoriteIds.length === 0) {
        setFavoriteBoxes([])
      } else {
        const {
          data: favoriteBoxData,
          error: favoriteBoxError,
        } = await supabase
          .from("treasure_boxes")
          .select("*")
          .in("id", favoriteIds)
          .order("created_at", { ascending: false })

        if (favoriteBoxError) {
          console.error(
            "お気に入り宝箱の取得に失敗:",
            favoriteBoxError
          )

          setFavoriteBoxes([])
        } else {
          const candidateBoxes = (
            favoriteBoxData ?? []
          ).filter((box) => {
            const owner =
              box.username?.trim().toLowerCase() ?? ""

            if (owner === username) return false

            if (box.visibility === "public") return true

            if (box.visibility === "private") return false

            return box.visibility === "friends"
          })

          const favoriteSecretIds = candidateBoxes
            .filter(
              (box) => box.visibility === "friends"
            )
            .map((box) => box.id)

          let allowedSecretIds = new Set<string>()

          if (favoriteSecretIds.length > 0) {
            const {
              data: memberData,
              error: memberError,
            } = await supabase
              .from("secret_box_members")
              .select("box_id")
              .eq("username", username)
              .in("box_id", favoriteSecretIds)

            if (memberError) {
              console.error(
                "お気に入り秘密宝箱の閲覧権限取得に失敗:",
                memberError
              )
            } else {
              allowedSecretIds = new Set(
                (memberData ?? []).map(
                  (item) => item.box_id
                )
              )
            }
          }

          setFavoriteBoxes(
            candidateBoxes.filter(
              (box) =>
                box.visibility !== "friends" ||
                allowedSecretIds.has(box.id)
            )
          )
        }
      }
    }

    // ============================
    // FRIENDS' BOXES
    // ============================

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

      setFollowingBoxes([])
      setBoxLoading(false)
      return
    }

    const followingUsernames = Array.from(
      new Set(
        (followData ?? [])
          .map(
            (item) =>
              item.following_username
                ?.trim()
                .toLowerCase()
          )
          .filter(
            (value): value is string =>
              Boolean(value)
          )
      )
    )

    if (followingUsernames.length === 0) {
      setFollowingBoxes([])
      setBoxLoading(false)
      return
    }

    const {
      data: followingBoxData,
      error: followingBoxError,
    } = await supabase
      .from("treasure_boxes")
      .select("*")
      .in("username", followingUsernames)
      .in("visibility", ["public", "friends"])
      .order("created_at", { ascending: false })

    if (followingBoxError) {
      console.error(
        "フォロー中ユーザーの宝箱取得に失敗:",
        followingBoxError
      )

      setFollowingBoxes([])
      setBoxLoading(false)
      return
    }

    const followingSecretIds = (
      followingBoxData ?? []
    )
      .filter(
        (box) => box.visibility === "friends"
      )
      .map((box) => box.id)

    let allowedSecretIds = new Set<string>()

    if (followingSecretIds.length > 0) {
      const {
        data: memberData,
        error: memberError,
      } = await supabase
        .from("secret_box_members")
        .select("box_id")
        .eq("username", username)
        .in("box_id", followingSecretIds)

      if (memberError) {
        console.error(
          "フォロー中の秘密宝箱の閲覧権限取得に失敗:",
          memberError
        )
      } else {
        allowedSecretIds = new Set(
          (memberData ?? []).map(
            (item) => item.box_id
          )
        )
      }
    }

    setFollowingBoxes(
      (followingBoxData ?? []).filter(
        (box) =>
          box.visibility === "public" ||
          allowedSecretIds.has(box.id)
      )
    )

    setBoxLoading(false)
  }

  async function searchUser() {
    const keyword = searchUsername.trim().toLowerCase()

    if (!keyword) {
      setSearchResult(null)
      return
    }

    if (!myUsername) return

    if (keyword === myUsername) {
      alert("自分自身はフォローできません")
      setSearchResult(null)
      return
    }

    setSearching(true)
    setSearchResult(null)

    const { data: profile, error } =
      await supabase
        .from("profiles")
        .select("username")
        .eq("username", keyword)
        .maybeSingle()

    if (error) {
      console.error("ユーザー検索に失敗:", error)

      alert(
        `ユーザー検索に失敗しました：${error.message}`
      )

      setSearching(false)
      return
    }

    if (!profile) {
      alert("そのユーザーIDは見つかりませんでした")
      setSearching(false)
      return
    }

    setSearchResult(profile)
    setSearching(false)
  }

  const isFollowing = searchResult
    ? followingUsers.includes(
        searchResult.username
          .trim()
          .toLowerCase()
      )
    : false

  async function toggleFollow() {
    if (!myUsername || !searchResult) return

    const targetUsername =
      searchResult.username
        .trim()
        .toLowerCase()

    if (targetUsername === myUsername) return

    setFollowLoading(true)

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_username", myUsername)
        .eq("following_username", targetUsername)

      if (error) {
        console.error(
          "フォロー解除に失敗:",
          error
        )

        alert(
          `フォロー解除に失敗しました：${error.message}`
        )

        setFollowLoading(false)
        return
      }
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({
          follower_username: myUsername,
          following_username: targetUsername,
        })

      if (error) {
        console.error(
          "フォローに失敗:",
          error
        )

        if (error.code === "23505") {
          alert("すでにフォローしています")
        } else {
          alert(
            `フォローに失敗しました：${error.message}`
          )
        }

        setFollowLoading(false)
        return
      }
    }

    await loadFollowing(myUsername)
    await loadBoxes(myUsername)

    setFollowLoading(false)
  }

  async function unfollowFromList(username: string) {
    if (!myUsername) return

    const confirmed = window.confirm(
      `@${username} のフォローを解除しますか？`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_username", myUsername)
      .eq("following_username", username)

    if (error) {
      console.error(
        "フォロー解除に失敗:",
        error
      )

      alert(
        `フォロー解除に失敗しました：${error.message}`
      )

      return
    }

    await loadFollowing(myUsername)
    await loadBoxes(myUsername)

    if (
      searchResult?.username
        .trim()
        .toLowerCase() === username
    ) {
      setSearchResult(searchResult)
    }
  }

  async function toggleFavorite(boxId: string) {
    if (!myUsername) {
      alert(
        "お気に入り機能を使うにはログインしてください。"
      )
      return
    }

    const isFavorite =
      favoriteBoxIds.includes(boxId)

    setFavoriteLoading(boxId)

    if (isFavorite) {
      const { error } = await supabase
        .from("box_favorites")
        .delete()
        .eq("username", myUsername)
        .eq("box_id", boxId)

      if (error) {
        console.error(
          "お気に入り解除に失敗:",
          error
        )

        alert(
          `お気に入り解除に失敗しました：${error.message}`
        )

        setFavoriteLoading(null)
        return
      }

      setFavoriteBoxIds((current) =>
        current.filter((id) => id !== boxId)
      )

      setFavoriteBoxes((current) =>
        current.filter(
          (box) => box.id !== boxId
        )
      )
    } else {
      const { error } = await supabase
        .from("box_favorites")
        .insert({
          username: myUsername,
          box_id: boxId,
        })

      if (error) {
        console.error(
          "お気に入り登録に失敗:",
          error
        )

        if (error.code !== "23505") {
          alert(
            `お気に入り登録に失敗しました：${error.message}`
          )
        }

        setFavoriteLoading(null)
        return
      }

      setFavoriteBoxIds((current) =>
        current.includes(boxId)
          ? current
          : [...current, boxId]
      )
    }

    setFavoriteLoading(null)
  }

  function BoxCard({
    box,
  }: {
    box: TreasureBox
  }) {
    const isFavorite =
      favoriteBoxIds.includes(box.id)

    const isFavoriteLoading =
      favoriteLoading === box.id

    return (
      <div className="relative rounded-3xl border border-[#FFB770] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
        <a
          href={`/boxes/${box.id}`}
          className="block pr-10"
        >
          <h2 className="text-xl font-bold">
            {box.name}
          </h2>
        </a>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm font-bold text-gray-500">
            @{box.username || "unknown"}
          </span>

          <VisibilityIcon
            visibility={box.visibility}
          />

          <button
            type="button"
            onClick={() =>
              toggleFavorite(box.id)
            }
            disabled={isFavoriteLoading}
            aria-label={
              isFavorite
                ? "お気に入りを解除"
                : "お気に入りに追加"
            }
            title={
              isFavorite
                ? "お気に入りを解除"
                : "お気に入りに追加"
            }
            className={`flex h-7 w-7 items-center justify-center transition ${
              isFavoriteLoading
                ? "opacity-50"
                : ""
            }`}
          >
            <Icon
              name="star"
              size={23}
              color={
                isFavorite
                  ? "#F8E75F"
                  : "#D1D5DB"
              }
            />
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] px-4 py-12 pb-28 text-gray-800 sm:pb-12">
      <SiteMenu />

      <div className="mx-auto max-w-6xl">
        <div className="mt-8">
        </div>

        {/* USER SEARCH */}
        <section className="mt-8">
          <h2 className="text-sm font-bold tracking-widest text-[#FFB770]">
            USER SEARCH
          </h2>

          <div className="mt-4 flex items-center rounded-2xl border border-[#FFB770] bg-white shadow-sm">
            <input
              type="text"
              value={searchUsername}
              onChange={(e) =>
                setSearchUsername(
                  e.target.value.toLowerCase()
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  searchUser()
                }
              }}
              placeholder="ユーザーID"
              className="min-w-0 flex-1 rounded-l-2xl bg-transparent px-4 py-4 outline-none"
            />

            <button
              type="button"
              onClick={searchUser}
              disabled={searching}
              aria-label="検索"
              title="検索"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-r-2xl text-[#FFB770] transition hover:bg-[#FFF1E3] disabled:opacity-50"
            >
              <Icon
                name="search"
                size={26}
              />
            </button>
          </div>

          {searchResult && (
            <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-[#FFF1E3] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-gray-400">
                  ユーザー
                </p>

                <p className="mt-1 font-bold">
                  @{searchResult.username}
                </p>
              </div>

              <button
                type="button"
                onClick={toggleFollow}
                disabled={followLoading}
                className={`rounded-full px-6 py-3 font-bold transition disabled:opacity-50 ${
                  isFollowing
                    ? "border border-[#FFB770] bg-white text-[#FFB770] hover:bg-[#FFF1E3]"
                    : "bg-[#FFB770] text-white hover:bg-[#FD9465]"
                }`}
              >
                {followLoading
                  ? "処理中..."
                  : isFollowing
                    ? "フォロー中"
                    : "＋ フォロー"}
              </button>
            </div>
          )}
        </section>

        {/* FRIENDS */}
        <section className="mt-10">
          <p className="text-sm font-bold tracking-widest text-[#FFB770]">
            FRIENDS
          </p>

          {loading ? (
            <div className="mt-4 rounded-3xl bg-white p-8 text-center shadow-sm">
              <p className="text-gray-500">
                読み込み中...
              </p>
            </div>
          ) : followingUsers.length === 0 ? (
            <div className="mt-4 rounded-3xl bg-white p-8 text-center shadow-sm">
              <p className="text-gray-500">
                まだ誰もフォローしていません。
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              {followingUsers.map(
                (username) => (
                  <div
                    key={username}
                    className="flex items-center gap-3 rounded-full border border-[#FFB770] bg-white px-4 py-2 shadow-sm"
                  >
                    <span className="font-bold text-gray-700">
                      @{username}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        unfollowFromList(
                          username
                        )
                      }
                      className="text-xs font-bold text-gray-400 hover:text-red-400"
                    >
                      解除
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* FAVORITE BOXES */}
        <section className="mt-12">
          <p className="text-sm font-bold tracking-widest text-[#FFB770]">
            FAVORITE BOXES
          </p>

          {boxLoading ? (
            <div className="mt-4 rounded-3xl bg-white p-10 text-center shadow-sm">
              <p className="text-gray-500">
                宝箱を読み込み中...
              </p>
            </div>
          ) : favoriteBoxes.length === 0 ? (
            <div className="mt-4 rounded-3xl bg-white p-10 text-center shadow-sm">
              <p className="font-bold">
                まだ気になる宝箱がありません。
              </p>

              <p className="mt-2 text-sm text-gray-500">
                気になる宝箱をお気に入りにすると、ここに表示されます。
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-6 md:grid-cols-3">
              {favoriteBoxes.map(
                (box) => (
                  <BoxCard
                    key={box.id}
                    box={box}
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* FRIENDS' BOXES */}
        <section className="mt-12">
          <p className="text-sm font-bold tracking-widest text-[#FFB770]">
            FRIENDS' BOXES
          </p>

          {boxLoading ? (
            <div className="mt-4 rounded-3xl bg-white p-10 text-center shadow-sm">
              <p className="text-gray-500">
                宝箱を読み込み中...
              </p>
            </div>
          ) : followingBoxes.length === 0 ? (
            <div className="mt-4 rounded-3xl bg-white p-10 text-center shadow-sm">
              <p className="font-bold">
                表示できる宝箱がありません。
              </p>

              <p className="mt-2 text-sm text-gray-500">
                ユーザーをフォローすると、その人の公開宝箱がここに表示されます。
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-6 md:grid-cols-3">
              {followingBoxes.map(
                (box) => (
                  <BoxCard
                    key={box.id}
                    box={box}
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}