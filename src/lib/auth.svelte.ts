import { browser } from "$app/environment"
import { createAuthClient } from "better-auth/svelte"

export const authClient = createAuthClient()

type _Session = typeof authClient.$Infer["Session"]
export type Session = _Session["session"]
export type User = _Session["user"]

let session = $state(null as Session | null)
let user = $state(null as User | null)
let isPending = $state(true)

if (browser) {
    authClient.useSession().subscribe(s => {
        isPending = s.isPending
        if (!isPending) {
            session = s.data?.session ?? null
            user = s.data?.user ?? null
        }
    })
}

export function getUser() {
    return user
}

export function getSession() {
    return session
}

export function getIsPending() {
    return isPending
}