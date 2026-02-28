// Main thread: uses a custom fetch that routes through the Worker RPC
import { Rpc } from "./rpc"
import type { WorkerRpc } from "./worker"

// 1. Spawn the worker (it runs the Hono app)
const worker = new Worker(new URL("./worker.ts", import.meta.url))
const client = Rpc.client<WorkerRpc>(worker)

// 2. Create a custom fetch that tunnels HTTP through the worker RPC
function createWorkerFetch(client: ReturnType<typeof Rpc.client<WorkerRpc>>): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init)
    const result = await client.call("fetch", {
      url: req.url,
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      body: init?.body as string | undefined,
    })
    return new Response(result.body, {
      status: result.status,
      headers: result.headers,
    })
  }) as typeof fetch
}

const workerFetch = createWorkerFetch(client)

// 3. Use it like normal fetch — but no HTTP server is running!
const BASE = "http://opencode.internal" // fake URL, never hits the network

console.log("--- GET /todos ---")
const list = await workerFetch(`${BASE}/todos`)
console.log(await list.json())

console.log("\n--- POST /todos ---")
const created = await workerFetch(`${BASE}/todos`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Learn Hono" }),
})
console.log(await created.json())

// Clean up
worker.terminate()
