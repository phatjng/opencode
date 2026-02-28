// Worker thread: runs a Hono app and exposes it over RPC
import { Hono } from "hono"
import { Rpc } from "./rpc"

// --- A normal Hono app (could have any routes) ---
const app = new Hono()
  .get("/todos", (c) =>
    c.json([
      { id: 1, text: "Buy milk" },
      { id: 2, text: "Write code" },
    ]),
  )
  .post("/todos", async (c) => {
    const body = await c.req.json()
    return c.json({ id: 3, text: body.text }, 201)
  })

// --- RPC handler: receives serialized HTTP requests, feeds them to Hono ---
const rpc = {
  async fetch(input: {
    url: string
    method: string
    headers: Record<string, string>
    body?: string
  }) {
    // Build a real Request and hand it to the Hono app
    const request = new Request(input.url, {
      method: input.method,
      headers: input.headers,
      body: input.body,
    })
    const response = await app.fetch(request)
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
    }
  },
}

export type WorkerRpc = typeof rpc
Rpc.listen(rpc)
