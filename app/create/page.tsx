"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import SiteMenu from "@/app/components/SiteMenu"

type StatusItem = {
  name: string
  color: string
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

export default function CreatePage() {
  const router = useRouter()

  const [username, setUsername] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [statuses, setStatuses] = useState<StatusItem[]>([])
  const [newStatus, setNewStatus] = useState("")
  const [newStatusColor, setNewStatusColor] = useState("#f3f4f6")
  const [visibility, setVisibility] = useState<
    "public" | "private" | "friends"
  >("public")
  const [followingUsers, setFollowingUsers] = useState<FollowUser[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loadingFollowing, setLoadingFollowing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        alert("宝箱を作るにはログインが必要です")
        router.push("/login")
        return
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle()

      if (error || !profile) {
        console.error(error)
        alert("ユーザー情報を取得できませんでした")
        router.push("/login")
        return
      }

      const currentUsername =
        profile.username.trim().toLowerCase()

      setUsername(currentUsername)

      // フォロー中のユーザーを取得
      setLoadingFollowing(true)

      const { data: followData, error: followError } =
        await supabase
          .from("follows")
          .select("following_username")
          .eq(
            "follower_username",
            currentUsername
          )
          .order("created_at", {
            ascending: false,
          })

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

      setLoadingFollowing(false)
      setLoadingUser(false)
    }

    loadUser()
  }, [router])

  function addStatus() {
    const status = newStatus.trim()

    if (!status) {
      return
    }

    if (
      statuses.some(
        (item) => item.name === status
      )
    ) {
      alert("同じステータスがあります")
      return
    }

    setStatuses([
      ...statuses,
      {
        name: status,
        color: newStatusColor,
      },
    ])

    setNewStatus("")
    setNewStatusColor("#f3f4f6")
  }

  function removeStatus(index: number) {
    setStatuses(
      statuses.filter((_, i) => i !== index)
    )
  }

  async function createTreasureBox() {
    if (!username) {
      alert("ログイン情報を確認できません")
      return
    }

    if (!name.trim()) {
      alert("宝箱の名前を入力してください")
      return
    }

    if (
      visibility === "friends" &&
      selectedUsers.length === 0
    ) {
      alert(
        "秘密の宝箱を作る場合は、見せる相手を1人以上選んでください"
      )
      return
    }

    setSaving(true)

    const boxId = crypto.randomUUID()

    const { error: boxError } =
      await supabase
        .from("treasure_boxes")
        .insert({
          id: boxId,
          username: username,
          name: name.trim(),
          description: description.trim(),
          is_public: visibility === "public",
          visibility,
        })

    if (boxError) {
      console.error(boxError)
      setSaving(false)

      alert(
        `宝箱の保存に失敗しました：${boxError.message}`
      )

      return
    }

    const statusRows = statuses.map(
      (status, index) => ({
        box_id: boxId,
        name: status.name,
        color: status.color,
        position: index,
      })
    )

    if (statusRows.length > 0) {
      const { error: statusError } =
        await supabase
          .from("box_statuses")
          .insert(statusRows)

      if (statusError) {
        console.error(statusError)

        setSaving(false)

        alert(
          `ステータスの保存に失敗しました：${statusError.message}`
        )

        return
      }
    }

    // 秘密の宝箱なら、選択したユーザーを保存
    if (
      visibility === "friends" &&
      selectedUsers.length > 0
    ) {
      const memberRows = selectedUsers.map(
        (selectedUsername) => ({
          box_id: boxId,
          username: selectedUsername,
        })
      )

      const { error: memberError } =
        await supabase
          .from("secret_box_members")
          .insert(memberRows)

      if (memberError) {
        console.error(memberError)

        setSaving(false)

        alert(
          `秘密の宝箱の共有相手の保存に失敗しました：${memberError.message}`
        )

        return
      }
    }

    setSaving(false)

    alert("宝箱を作成しました！")

    setName("")
    setDescription("")
    setStatuses([])
    setNewStatus("")
    setNewStatusColor("#f3f4f6")
    setVisibility("public")
    setSelectedUsers([])

    router.push(`/boxes/${boxId}`)
  }

  if (loadingUser) {
    return (
      <main className="min-h-screen bg-[#fffaf0] px-6 py-12 text-gray-800">
        <div className="mx-auto max-w-xl">
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">
              ログイン情報を確認しています...
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] px-6 py-12 text-gray-800">
      <div className="mx-auto max-w-xl">

        <div className="flex justify-end">
          <SiteMenu />
        </div>

        <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
          <div className="mt-8 space-y-5">

            {/* 宝箱の名前 */}
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="宝箱の名前"
                className="w-full rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-3 outline-none focus:border-[#FF9D4F]"
              />
            </div>

            {/* 説明 */}
            <div>
              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="説明"
                rows={4}
                className="w-full resize-none rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-3 outline-none focus:border-[#FF9D4F]"
              />
            </div>

            {/* ステータス */}
            <div>
              {statuses.length > 0 && (
                <div className="space-y-2">
                  {statuses.map((status, index) => (
                    <div
                      key={`${status.name}-${index}`}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3"
                      style={{
                        backgroundColor: status.color,
                      }}
                    >
                      <span className="flex-1 font-medium">
                        {status.name}
                      </span>

                      <div
                        className="h-7 w-7 shrink-0 rounded-full border-2 border-white shadow-sm"
                        style={{
                          backgroundColor: status.color,
                        }}
                        title={status.color}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeStatus(index)
                        }
                        className="text-sm text-gray-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 rounded-2xl border border-orange-100 bg-orange-50/30 p-4">
                <div className="flex items-center gap-3">
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
                    placeholder="例：みた"
                    className="min-w-0 flex-1 rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none focus:border-[#FF9D4F]"
                  />

                  <label className="flex shrink-0 cursor-pointer items-center justify-center">
                    <input
                      type="color"
                      value={newStatusColor}
                      onChange={(e) =>
                        setNewStatusColor(
                          e.target.value
                        )
                      }
                      className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
                      aria-label="ステータスの色"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={addStatus}
                  className="mt-3 w-full rounded-2xl bg-orange-100 px-5 py-3 font-bold text-[#FF9D4F] hover:bg-orange-200"
                >
                  ＋ステータスを追加
                </button>
              </div>
            </div>

            {/* 公開範囲 */}
            <div>
              <div className="grid gap-3">

                {/* 公開 */}
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    visibility === "public"
                      ? "border-[#FF9D4F] bg-orange-50 shadow-sm"
                      : "border-orange-100 bg-white hover:bg-orange-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex shrink-0 items-center text-gray-600">
                      <Icon name="world" size={22} />
                    </span>

                    <p className="font-bold text-gray-800">
                      公開
                    </p>
                  </div>
                </button>

                {/* 非公開 */}
                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    visibility === "private"
                      ? "border-[#FF9D4F] bg-orange-50 shadow-sm"
                      : "border-orange-100 bg-white hover:bg-orange-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex shrink-0 items-center text-gray-600">
                      <Icon name="key" size={22} />
                    </span>

                    <p className="font-bold text-gray-800">
                      非公開
                    </p>
                  </div>
                </button>

                {/* 秘密 */}
                <button
                  type="button"
                  onClick={() => setVisibility("friends")}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    visibility === "friends"
                      ? "border-[#FF9D4F] bg-orange-50 shadow-sm"
                      : "border-orange-100 bg-white hover:bg-orange-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex shrink-0 items-center text-gray-600">
                      <Icon name="diamond" size={22} />
                    </span>

                    <div>
                      <p className="font-bold text-gray-800">
                        秘密の宝箱
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        フォローユーザーから閲覧可能者を指定できます。
                      </p>
                    </div>
                  </div>
                </button>

              </div>

              {visibility === "friends" && (
                <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/50 p-4">

                  {loadingFollowing ? (
                    <p className="mt-4 text-sm text-gray-400">
                      フォロー中のユーザーを読み込み中...
                    </p>
                  ) : followingUsers.length === 0 ? (
                    <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-gray-500">
                      まだ誰もフォローしていません。
                      <br />
                      先にフォローしてから秘密の宝箱を作ってください。

                      <a
                        href="/following"
                        className="mt-3 inline-block font-bold text-[#FF9D4F] hover:text-[#f58f3f]"
                      >
                        フォローする →
                      </a>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {followingUsers.map((followUser) => {
                        const checked =
                          selectedUsers.includes(
                            followUser.username
                          )

                        return (
                          <label
                            key={followUser.username}
                            className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                              checked
                                ? "border-[#FF9D4F] bg-white"
                                : "border-orange-100 bg-white/70 hover:bg-white"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers(
                                    (current) => [
                                      ...current,
                                      followUser.username,
                                    ]
                                  )
                                } else {
                                  setSelectedUsers(
                                    (current) =>
                                      current.filter(
                                        (username) =>
                                          username !==
                                          followUser.username
                                      )
                                  )
                                }
                              }}
                              className="h-5 w-5 accent-[#FFB770]"
                            />

                            <span className="font-bold">
                              @{followUser.username}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {selectedUsers.length > 0 && (
                    <p className="mt-3 text-xs font-bold text-[#FF9D4F]">
                      {selectedUsers.length}人を選択中
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={createTreasureBox}
              disabled={saving}
              className="w-full rounded-full bg-[#FF9D4F] px-6 py-4 font-bold text-white shadow-md transition hover:bg-[#f58f3f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "作成中..."
                : "宝箱をつくる"}
            </button>

          </div>
        </div>

        {/* スマホ下部メニューに最後の内容が隠れないための余白 */}
        <div className="h-20 sm:hidden" />

      </div>
    </main>
  )
}