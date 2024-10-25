import { StandardMerkleTree } from '@openzeppelin/merkle-tree'
import { verificationError, VerificationResponse, verificationResult, VerificationResult } from './types'

export const ZERO_BYTES32 = `0x${'00'.repeat(32)}`

const baseUrl = 'https://raw.githubusercontent.com/AcronymFoundation/anvil-reward-proofs/refs/heads/'
const leavesFileName = 'leaves.csv'
const proofsDirName = 'proofs/'

/**
 * Verifies the provided merkle root against the root and proofs published to GitHub.
 * @param root The Merkle root to verify.
 * @return The VerificationResponse object indicating details as to the verification status of the provided root.
 */
export async function verifyRoot(root: string): Promise<VerificationResponse> {
  const leavesUrl = `${baseUrl}${root}/${leavesFileName}`
  const leavesResp = await fetch(leavesUrl)

  if (!leavesResp.ok) {
    return verificationError(
      `Could not get leaves for root ${root} from ${leavesUrl}: ${leavesResp.status}: ${leavesResp.statusText}`
    )
  }

  const leaves = (await leavesResp.text()).split('\n').map((line) => line.split(','))
  const tree = rewardTreeFromLeaves(leaves)

  const resp: VerificationResult = verificationResult(true)
  resp.valid = tree.root === root

  await Promise.all(
    leaves.map(async (leaf) => {
      const address = leaf[0]
      const amount = leaf[1]
      resp.leafSum += BigInt(amount).valueOf()

      const url = `${baseUrl}${root}/${proofsDirName}${address.toLowerCase()}.json` // NB: first entry is address
      const leafResp = await fetch(url)
      if (!leafResp.ok) {
        resp.leavesThatWereNotFound.push({ atUrl: url, amount, address })
        resp.valid = false
        return
      }

      // Will be of the form {amount: "1234567890", proof: ["0x{64}", "0x{64}", ...]
      const proof: any = JSON.parse(await leafResp.text())
      if (proof.amount !== amount) {
        resp.leavesWithAmountMismatch.push({ atUrl: url, amount, address, amountAtUrl: proof.amount })
        resp.valid = false
        return
      }

      if (!tree.verify(leaf, proof.proof)) {
        resp.leavesWithProofInvalid.push({ atUrl: url, amount, address, proof: proof.proof })
        resp.valid = false
        return
      }
    })
  )

  return resp
}

/**
 * Creates a Reward contract Merkle Tree from the provided leaf data.
 * @param leaves The leaves, each of which is expected to be in the format [address,amount].
 * @return The Merkle Tree.
 */
export function rewardTreeFromLeaves(leaves: string[][]): StandardMerkleTree<string[]> {
  leaves.sort((a, b) => a[0].localeCompare(b[0]))
  return StandardMerkleTree.of(<string[][]>leaves, ['address', 'uint256'])
}

/**
 * Returns whether the provided input is a valid bytes32 string.
 * @param input The input to verify.
 * @return True if valid bytes32, false otherwise.
 */
export function isBytes32(input: string): boolean {
  // Regular expression to check for 64 hexadecimal characters (case-insensitive)
  const hexRegex = /^0x[a-fA-F0-9]{64}$/
  return hexRegex.test(input)
}

/**
 * Returns whether the provided input is a valid address string.
 * @param input The input to verify.
 * @return True if valid address, false otherwise.
 */
export function isAddress(input: string): boolean {
  // Regular expression to check for 64 hexadecimal characters (case-insensitive)
  const hexRegex = /^0x[a-fA-F0-9]{40}$/
  return hexRegex.test(input)
}

/**
 * Creates a formatted list of issues that were found in the provided VerificationResult.
 * @param failedResult The result from which to populate a user-friendly string.
 * @return The error string.
 */
export function getListOfIssuesString(failedResult: VerificationResult): string {
  let msg = ''
  if (!!failedResult.leavesThatWereNotFound.length) {
    msg += '\tThe following leaves were not found:\n\t\t'
    failedResult.leavesThatWereNotFound.map((x) => `[${x.address},${x.amount}] at url ${x.atUrl}`).join(',\n\t\t')
    msg += '\n'
  }
  if (!!failedResult.leavesWithProofInvalid.length) {
    msg += '\tThe following leaves had invalid proofs:\n\t\t'
    failedResult.leavesWithProofInvalid.map((x) => `[${x.address},${x.amount}] at url ${x.atUrl}`).join(',\n\t\t')
    msg += '\n'
  }
  if (!!failedResult.leavesWithAmountMismatch.length) {
    msg += '\tThe following leaves had amount mismatches:\n\t\t'
    failedResult.leavesWithAmountMismatch
      .map((x) => `[${x.address},${x.amount}] found amount ${x.amountAtUrl} at url ${x.atUrl}`)
      .join(',\n\t\t')
  }
  return msg
}

/**
 * Formats an amount of ANVL in the most granular unit (i.e. WEI) as an amount of whole ANVL, including commas and
 * decimal places.
 * @param amount The amount to format.
 * @return The formatted string.
 */
export function formatAnvil(amount: BigInt): string {
  const amtString = amount.toString()
  const delta = Math.abs(amtString.length - 18)
  let formattedNumber: string
  if (amtString.length <= 18) {
    formattedNumber = `0.${'0'.repeat(delta)}`
  } else {
    formattedNumber = `${parseInt(amtString.slice(0, delta)).toLocaleString()}.${amtString.slice(delta)}`
  }

  return `${formattedNumber} ANVL`
}
