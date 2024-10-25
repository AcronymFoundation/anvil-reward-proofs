import { formatAnvil, getListOfIssuesString, isBytes32, verifyRoot } from './helpers'
import chalk from 'chalk'
import { isVerificationError, VerificationError, VerificationResponse, VerificationResult } from './types'

function printUsage(exitCode: number = 1) {
  console.log(`node verifyRoot "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"`)
  process.exit(exitCode)
}

/**
 * Parses the expected command line args and does validation.
 * In this case, that is just the Merkle Root to verify.
 */
function parseRootArg(): string {
  const args = process.argv
  if (args.length < 3) {
    printUsage()
  }

  const rootArg = args[2]
  const root = (rootArg.startsWith('0x') ? rootArg : `0x${rootArg}`).toLowerCase()
  if (!isBytes32(root)) {
    console.log(chalk.red('root argument must be 64 hex characters'))
    printUsage()
  }

  return root
}

async function main() {
  const root = parseRootArg()

  const resp: VerificationResponse = await verifyRoot(root)
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
