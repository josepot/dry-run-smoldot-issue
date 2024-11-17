import {
  DispatchRawOrigin,
  dot,
  MultiAddress,
  PolkadotRuntimeOriginCaller,
} from "@polkadot-api/descriptors"
import { createClient, type SS58String } from "polkadot-api"
import { getSmProvider } from "polkadot-api/sm-provider"
import { chainSpec } from "polkadot-api/chains/polkadot"
import { start } from "polkadot-api/smoldot"
import { appendFileSync, existsSync, rmSync } from "fs"
import { withLogsRecorder } from "polkadot-api/logs-provider"

let tickDate = ""
let timeoutToken
const setTickDate = () => {
  tickDate = new Date().toISOString()
  timeoutToken = setTimeout(setTickDate, 0)
}
setTickDate()

const WIRE_FILE = "wire-logs.txt"
const SMOLDOT_LOGS_FILE = "smoldot-logs.txt"

if (existsSync(WIRE_FILE)) rmSync(WIRE_FILE)
if (existsSync(SMOLDOT_LOGS_FILE)) rmSync(SMOLDOT_LOGS_FILE)

const smoldot = start({
  maxLogLevel: 9,
  logCallback: (level: number, target: string, message: string) => {
    appendFileSync(
      SMOLDOT_LOGS_FILE,
      `${tickDate} (${level})${target}\n${message}\n\n`,
    )
  },
})
const chain = await smoldot.addChain({ chainSpec })

const client = createClient(
  withLogsRecorder((log) => {
    appendFileSync(WIRE_FILE, log + "\n")
  }, getSmProvider(chain)),
)
const dotApi = client.getTypedApi(dot)

const fromAddress: SS58String =
  "15roJ4ZrgrZam5BQWJgiGHpgp7ShFQBRNLq6qUfiNqXDZjMK"

console.log(await dotApi.query.System.Account.getValue(fromAddress))

const tx = dotApi.tx.Balances.transfer_keep_alive({
  dest: MultiAddress.Id("14dZ1SSu3krJ8TyBY1E4GQ5RDcnjDaop1J9irm9cSs7T6Xq9"),
  value: 10_000_000_000n,
})

const result = await dotApi.apis.DryRunApi.dry_run_call(
  PolkadotRuntimeOriginCaller.system(
    DispatchRawOrigin.Signed(
      "15roJ4ZrgrZam5BQWJgiGHpgp7ShFQBRNLq6qUfiNqXDZjMK",
    ),
  ),
  tx.decodedCall,
)

console.log(result)
client.destroy()
clearTimeout(timeoutToken)
