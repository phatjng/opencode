// Minimal RPC layer: sends JSON messages over Worker postMessage
export namespace Rpc {
  type Definition = { [method: string]: (input: any) => any }

  /** Worker side: listen for RPC calls and respond */
  export function listen(rpc: Definition) {
    onmessage = async (evt) => {
      const msg = JSON.parse(evt.data)
      if (msg.type === "rpc.request") {
        const result = await rpc[msg.method](msg.input)
        postMessage(
          JSON.stringify({ type: "rpc.result", id: msg.id, result }),
        )
      }
    }
  }

  /** Main thread side: call methods on the worker */
  export function client<T extends Definition>(worker: Worker) {
    const pending = new Map<number, (result: any) => void>()
    let id = 0

    worker.onmessage = (evt) => {
      const msg = JSON.parse(evt.data)
      if (msg.type === "rpc.result") {
        pending.get(msg.id)?.(msg.result)
        pending.delete(msg.id)
      }
    }

    return {
      call<M extends keyof T>(
        method: M,
        input: Parameters<T[M]>[0],
      ): Promise<ReturnType<T[M]>> {
        const reqId = id++
        return new Promise((resolve) => {
          pending.set(reqId, resolve)
          worker.postMessage(
            JSON.stringify({
              type: "rpc.request",
              method,
              input,
              id: reqId,
            }),
          )
        })
      },
    }
  }
}
