import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const username = String(body.username ?? "")
      .trim()
      .toLowerCase()

    const password = String(body.password ?? "")
    const recoverySecret = String(body.recoverySecret ?? "").trim()

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "ユーザーIDは3〜20文字の英数字と「_」で入力してください",
        },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "パスワードは6文字以上にしてください" },
        { status: 400 }
      )
    }

    if (recoverySecret.length < 3) {
      return NextResponse.json(
        { error: "秘密の合言葉は3文字以上にしてください" },
        { status: 400 }
      )
    }

    const { data: existingProfile, error: profileCheckError } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle()

    if (profileCheckError) {
      console.error(profileCheckError)

      return NextResponse.json(
        { error: "ユーザーIDの確認に失敗しました" },
        { status: 500 }
      )
    }

    if (existingProfile) {
      return NextResponse.json(
        { error: "そのユーザーIDはすでに使われています" },
        { status: 409 }
      )
    }

    const internalEmail = `${username}@example.com`

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: internalEmail,
        password,
        email_confirm: true,
      })

    if (authError || !authData.user) {
      console.error(authError)

      return NextResponse.json(
        {
          error:
            authError?.message ??
            "アカウントの作成に失敗しました",
        },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        username,
      })

    if (profileError) {
      console.error(profileError)

      await supabaseAdmin.auth.admin.deleteUser(userId)

      return NextResponse.json(
        { error: "ユーザー情報の保存に失敗しました" },
        { status: 500 }
      )
    }

    const secretHash = await bcrypt.hash(recoverySecret, 12)

    const { error: secretError } = await supabaseAdmin
      .from("recovery_secrets")
      .insert({
        user_id: userId,
        secret_hash: secretHash,
      })

    if (secretError) {
      console.error(secretError)

      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId)

      await supabaseAdmin.auth.admin.deleteUser(userId)

      return NextResponse.json(
        { error: "秘密の合言葉の保存に失敗しました" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userId,
      username,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "アカウントの作成に失敗しました" },
      { status: 500 }
    )
  }
}