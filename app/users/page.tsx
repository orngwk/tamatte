"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type UserProfile = {
  username: string
}

export default function UsersPage() {
  const [myUsername, setMyUsername] = useState<string | null>(null)
  const [keyword, setKeyword] = useState("")
  const [users, setUsers] = useState<UserProfile[]>([])
  const [followingUsernames, setFollowingUsernames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [followLoading, setFollowLoading] = useState<string | null>(null)

  useEffect(() => {
    async function loadUser() {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setMyUsername(null)
        setUsers([])
        setFollowingUsernames([])
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle()

      if (profileError) {
        console.error("ユーザー情報の取得に失敗:", profileError)
      }

      const username =
        profile?.username?.trim().toLowerCase() ?? null

      setMyUsername(username)

      if (username) {
        const { data: followData, error: followError } =
          await supabase
            .from("follows")
            .select("following_username")
            .eq("follower_username", username)

        if (followError) {
          console.error(
            "フォロー情報の取得に失敗:",
            followError
          )
        } else {
          setFollowingUsernames(
            (followData ?? []).map((item) =>
              item.following_username
                .trim()
                .toLowerCase()
            )
          )
        }
      }

      setLoading(false)
    }

    loadUser()
  }, [])

  async function searchUsers() {
    const searchWord = keyword.trim().toLowerCase()

    if (!searchWord) {
      setUsers([])
      return
    }

    setSearching(true)

    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .ilike("username", `%${searchWord}%`)
      .order("username", { ascending: true })
      .limit(30)

    if (error) {
      console.error("ユーザー検索に失敗:", error)
      alert(
        `ユーザー検索に失敗しました：${error.message}`
      )
      setUsers([])
      setSearching(false)
      return
    }

    setUsers(
      (data ?? [])
        .map((item) => ({
          username: item.username.trim().toLowerCase(),
        }))
        .filter(
          (item) =>
            item.username !==
            myUsername?.trim().toLowerCase()
        )
    )

    setSearching(false)
  }

  async function toggleFollow(username: string) {
    if (!myUsername) {
      alert("ログインしてください")
      return
    }

    const targetUsername = username.trim().toLowerCase()
    const isFollowing =
      followingUsernames.includes(targetUsername)

    setFollowLoading(targetUsername)

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
        setFollowLoading(null)
        return
      }

      setFollowingUsernames((current) =>
        current.filter(
          (item) => item !== targetUsername
        )
      )
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
          setFollowingUsernames((current) =>
            current.includes(targetUsername)
              ? current
              : [...current, targetUsername]
          )
        } else {
          alert(
            `フォローに失敗しました：${error.message}`
          )
        }

        setFollowLoading(null)
        return
      }

      setFollowingUsernames((current) =>
        current.includes(targetUsername)
          ? current
          : [...current, targetUsername]
      )
    }

    setFollowLoading(null)
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    searchUsers()
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] px-4 py-10 text-gray-800 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <a
          href="/boxes"
          className="text-sm font-medium text-orange-400 hover:text-orange-500"
        >
          ← 宝箱に戻る
        </a>

        <div className="mt-8">
          <p className="text-sm font-bold tracking-widest text-orange-400">
            USER SEARCH
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            ユーザーを探す
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500 sm:text-base">
            ユーザーIDを検索して、気になる人をフォローできます。
          </p>
        </div>

        <section className="mt-8 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={keyword}
              onChange={(event) =>
                setKeyword(event.target.value)
              }
              placeholder="ユーザーIDを入力"
              className="min-w-0 flex-1 rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-3 outline-none focus:border-orange-300"
            />

            <button
              type="submit"
              disabled={searching}
              className="rounded-2xl bg-orange-400 px-6 py-3 font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
            >
              {searching ? "検索中..." : "🔎 検索"}
            </button>
          </form>

          <p className="mt-3 text-xs text-gray-400">
            例：test999
          </p>
        </section>

        {loading ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">
              ユーザー情報を読み込み中...
            </p>
          </div>
        ) : users.length > 0 ? (
          <section className="mt-8 space-y-3">
            {users.map((user) => {
              const isFollowing =
                followingUsernames.includes(
                  user.username
                )

              const isLoading =
                followLoading === user.username

              return (
                <article
                  key={user.username}
                  className="flex items-center justify-between gap-4 rounded-3xl bg-white p-5 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="break-all font-bold">
                      @{user.username}
                    </p>

                    {isFollowing && (
                      <p className="mt-1 text-xs font-medium text-orange-400">
                        フォロー中
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      toggleFollow(user.username)
                    }
                    disabled={isLoading}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                      isFollowing
                        ? "border border-orange-200 bg-white text-orange-400 hover:bg-orange-50"
                        : "bg-orange-400 text-white hover:bg-orange-500"
                    } disabled:opacity-50`}
                  >
                    {isLoading
                      ? "処理中..."
                      : isFollowing
                        ? "フォロー中"
                        : "＋ フォロー"}
                  </button>
                </article>
              )
            })}
          </section>
        ) : keyword.trim() ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm">
            <div className="text-4xl">🔎</div>
            <p className="mt-4 font-bold">
              該当するユーザーが見つかりません。
            </p>
            <p className="mt-2 text-sm text-gray-500">
              ユーザーIDを確認して、もう一度検索してください。
            </p>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm">
            <div className="text-4xl">👤</div>
            <p className="mt-4 font-bold">
              ユーザーIDを検索してみよう
            </p>
            <p className="mt-2 text-sm text-gray-500">
              秘密の宝箱で共有する友達を探すときにも使います。
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a
            href="/following"
            className="rounded-full border border-orange-200 bg-white px-5 py-3 text-sm font-bold text-orange-400 hover:bg-orange-50"
          >
            🌟 フォロー中
          </a>

          <a
            href="/boxes"
            className="rounded-full border border-orange-200 bg-white px-5 py-3 text-sm font-bold text-orange-400 hover:bg-orange-50"
          >
            🎁 宝箱
          </a>

          <a
            href="/timeline"
            className="rounded-full border border-orange-200 bg-white px-5 py-3 text-sm font-bold text-orange-400 hover:bg-orange-50"
          >
            タイムライン
          </a>
        </div>
      </div>
    </main>
  )
}
