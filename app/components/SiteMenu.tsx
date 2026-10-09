"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type User = {
  id: string
  username: string
}

function Icon({
  name,
  size = 22,
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

const navItems = [
  { href: "/calendar", label: "カレンダー", icon: "calendar" },
  { href: "/boxes", label: "宝箱一覧", icon: "treasure2" },
  { href: "/timeline", label: "タイムライン", icon: "home" },
  { href: "/favorites", label: "お気に入り", icon: "heart" },
  { href: "/following", label: "なかまたち", icon: "person" },
]

export default function SiteMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        setUser(null)
        return
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", authUser.id)
        .single()

      if (data) {
        setUser(data)
      }
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <>
      {/* PC / タブレット用 上部メニュー */}
      <header className="fixed left-0 right-0 top-0 z-[60] hidden w-full border-b border-[#FFb770]/40 bg-white sm:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

          <Link
            href="/"
            className="text-xl font-bold tracking-wide text-[#Fd9465]"
          >
            tamatte
          </Link>

          <div className="flex items-center gap-5">

            {user && (
              <Link
                href="/login"
                className="text-sm text-gray-600 transition hover:text-[#Fd9465]"
              >
                @{user.username}でログイン中
              </Link>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="rounded-full border border-[#FFb770] px-4 py-2 text-sm text-gray-700 transition hover:bg-[#FFF4E6] hover:text-[#Fd9465]"
              >
                MENU
              </button>

              {menuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-2xl border border-[#FFb770]/40 bg-white p-2 shadow-lg">

                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-700 transition hover:bg-[#FFF4E6] hover:text-[#Fd9465]"
                    >
                      <Icon name={item.icon} size={20} />
                      <span>{item.label}</span>
                    </Link>
                  ))}

                  <Link
                    href="/create"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-700 transition hover:bg-[#FFF4E6] hover:text-[#d9465]"
                  >
                    <Icon
                      name="plus"
                      size={20}
                    />
                    <span>宝物を追加する</span>
                  </Link>

                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* スマホ用 上部 */}
      <header className="fixed left-0 right-0 top-0 z-[60] flex h-16 w-full items-center overflow-hidden border-b border-[#FFb770]/30 bg-[#fffaf0]/95 px-4 backdrop-blur sm:hidden">

        {/* tamatte */}
        <Link
          href="/"
          className="shrink-0 text-3xl font-bold tracking-wide text-[#Fd9465]"
        >
          tamatte
        </Link>

        {/* 右側のユーザー表示 */}
        <Link
          href="/login"
          className="absolute right-[-18px] top-1/2 flex h-10 min-w-[96px] max-w-[170px] -translate-y-1/2 items-center justify-center overflow-hidden rounded-l-full bg-[#FFb770] px-5 pr-8 text-xs font-bold text-white whitespace-nowrap"
        >
          <span className="truncate">
            {user
              ? `@${user.username}`
              : "はじめる"}
          </span>
        </Link>

      </header>

      {/* スマホ用 下部メニュー */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#FFb770]/40 bg-white sm:hidden">
        <div className="flex h-14 items-center justify-around px-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-full text-gray-600 transition hover:text-[#Fd9465] active:text-[#Fd9465]"
            >
              <span className="-translate-y-[2px]">
                <Icon name={item.icon} size={25} />
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}