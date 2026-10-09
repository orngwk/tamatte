"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [recoverySecret, setRecoverySecret] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    async function checkLogin() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setIsLoggedIn(!!session)
    }

    checkLogin()
  }, [])

  async function handleLogout() {
    setLoading(true)

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error(error)
      setLoading(false)
      alert("ログアウトに失敗しました")
      return
    }

    setIsLoggedIn(false)
    setLoading(false)
    setUsername("")
    setPassword("")
    setRecoverySecret("")

    alert("ログアウトしました")
  }

  async function handleSubmit() {
    const usernameValue = username.trim().toLowerCase()

    if (!usernameValue) {
      alert("ユーザーIDを入力してください")
      return
    }

    if (!/^[a-z0-9_]{3,20}$/.test(usernameValue)) {
      alert(
        "ユーザーIDは3〜20文字の英数字と「_」で入力してください"
      )
      return
    }

    if (password.length < 6) {
      alert("パスワードは6文字以上にしてください")
      return
    }

    if (isSignUp && recoverySecret.trim().length < 3) {
      alert("秘密の合言葉は3文字以上にしてください")
      return
    }

    setLoading(true)

    if (isSignUp) {
      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: usernameValue,
            password,
            recoverySecret: recoverySecret.trim(),
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          setLoading(false)
          alert(
            result.error ??
              "アカウントの作成に失敗しました"
          )
          return
        }

        const internalEmail = `${usernameValue}@example.com`

        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: internalEmail,
            password,
          })

        if (loginError) {
          console.error(loginError)
          setLoading(false)
          alert(
            "アカウントは作成されましたが、自動ログインに失敗しました。ログイン画面からログインしてください"
          )
          setIsSignUp(false)
          return
        }

        setIsLoggedIn(true)
        setLoading(false)

        alert("アカウントを作成しました！🎁")
        router.push("/")
        return
      } catch (error) {
        console.error(error)
        setLoading(false)
        alert("通信に失敗しました")
        return
      }
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", usernameValue)
        .maybeSingle()

    if (profileError) {
      console.error(profileError)
      setLoading(false)
      alert("ユーザーIDの確認に失敗しました")
      return
    }

    if (!profile) {
      setLoading(false)
      alert("そのユーザーIDは見つかりません")
      return
    }

    const internalEmail = `${usernameValue}@example.com`

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      })

    if (loginError) {
      console.error(loginError)
      setLoading(false)
      alert(
        "ログインに失敗しました。ユーザーIDまたはパスワードを確認してください"
      )
      return
    }

    setIsLoggedIn(true)
    setLoading(false)

    alert("ログインしました！🎁")
    router.push("/")
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] px-6 py-12 text-gray-800">
      <div className="mx-auto max-w-md">
        <a
          href="/"
          className="text-sm font-medium text-orange-400 hover:text-orange-500"
        >
          ← トップに戻る
        </a>

        <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50 text-4xl">
              🎁
            </div>

            <p className="mt-6 text-sm font-bold tracking-widest text-orange-400">
              TREASURE BOX
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              {isSignUp ? "アカウントをつくる" : "ログイン"}
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              {isSignUp
                ? "あなたの「好き」を集める準備をしましょう。"
                : "宝箱に戻って、あなたの「好き」を集めよう。"}
            </p>
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block font-bold">
                ユーザーID
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例：taro123"
                autoComplete="username"
                className="w-full rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-3 outline-none focus:border-orange-300"
              />

              {isSignUp && (
                <p className="mt-2 text-xs text-gray-400">
                  3〜20文字・英数字と「_」が使えます
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block font-bold">
                パスワード
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                autoComplete={
                  isSignUp
                    ? "new-password"
                    : "current-password"
                }
                className="w-full rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-3 outline-none focus:border-orange-300"
              />
            </div>

            {isSignUp && (
              <div>
                <label className="mb-2 block font-bold">
                  秘密の合言葉
                </label>

                <input
                  type="text"
                  value={recoverySecret}
                  onChange={(e) =>
                    setRecoverySecret(e.target.value)
                  }
                  placeholder="パスワードを忘れたときに使います"
                  autoComplete="off"
                  className="w-full rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-3 outline-none focus:border-orange-300"
                />

                <p className="mt-2 text-xs leading-5 text-gray-400">
                  パスワードを忘れたときに本人確認として使います。
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                console.log("ログインボタンを押しました")
                handleSubmit()
              }}
              disabled={loading}
              className="w-full rounded-full bg-orange-400 px-6 py-4 font-bold text-white shadow-md transition hover:bg-orange-500 disabled:opacity-50"
            >
              {loading
                ? "処理中..."
                : isSignUp
                  ? "アカウントをつくる 🎁"
                  : "ログインする 🔑"}
            </button>
          </div>

          <div className="mt-8 border-t border-orange-100 pt-6 text-center">
            <p className="text-sm text-gray-500">
              {isSignUp
                ? "すでにアカウントを持っていますか？"
                : "まだアカウントを持っていませんか？"}
            </p>

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="mt-2 font-bold text-orange-400 hover:text-orange-500"
            >
              {isSignUp
                ? "ログインする"
                : "新規登録する"}
            </button>
          </div>

          {isLoggedIn && (
            <div className="mt-6 border-t border-orange-100 pt-6 text-center">
              <p className="text-sm text-gray-500">
                現在ログインしています
              </p>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="mt-3 rounded-full border border-gray-200 px-6 py-3 font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? "処理中..." : "ログアウトする"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}