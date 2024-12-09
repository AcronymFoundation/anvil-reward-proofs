import { formatAnvil, getListOfIssuesString, isBytes32, verifyRoot } from './helpers'
import chalk from 'chalk'
import { isVerificationError, VerificationError, VerificationResponse, VerificationResult } from './types'
import { Contract } from 'ethers'

function printUsage(exitCode: number = 1) {
  console.log(`node verifyRoot <NETWORK_NAME> <HEX_ROOT_STRING>`)
  console.log(`example: node verifyRoot mainnet "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"`)
  process.exit(exitCode)
}

interface ParsedArgs {
  networkName: string
  root: string
}

/**
 * Parses the expected command line args and does validation.
 * In this case, that is just the network name and Merkle Root to verify.
 */
function parseArgs(): ParsedArgs {
  const args = process.argv
  if (args.length < 4) {
    printUsage()
  }

  const networkName = args[2].toLowerCase()

  const rootArg = args[3]
  const root = (rootArg.startsWith('0x') ? rootArg : `0x${rootArg}`).toLowerCase()
  if (!isBytes32(root)) {
    console.log(chalk.red('root argument must be 64 hex characters'))
    printUsage()
  }

  return {
    networkName,
    root
  }
}

async function main() {
  const { root, networkName }: ParsedArgs = parseArgs()

  const branchPrefix = networkName.toLowerCase() === 'mainnet' ? '' : 'testnet-'
  const resp: VerificationResponse = await verifyRoot(root, branchPrefix)
  const isError = isVerificationError(resp)
  if (isError) {
    console.log(chalk.red(`error verifying root ${root}: ${(resp as VerificationError).msg}`))
    process.exit(1)
  }
  const result = resp as VerificationResult
  if (result.valid) {
    console.log(chalk.green('Root is valid and all proofs exist and are valid.'))
    console.log(chalk.yellow(`${root} makes a total of ${formatAnvil(result.leafSum)} claimable.`))
  } else {
    console.log(chalk.red(`${root} is invalid with the following issues:\n\t${getListOfIssuesString(result)}`))
    process.exit(1)
  }
}

main().catch((e) => {
  console.log(chalk.red(`caught error in main function: ${JSON.stringify(e)}`))
  throw e
})
