import { Contract, ethers } from 'ethers'
import RewardABI from '../abi/Reward.json'
import { formatAnvil, getListOfIssuesString, isAddress, verifyRoot, ZERO_BYTES32 } from './helpers'
import chalk from 'chalk'
import { isVerificationError, VerificationError, VerificationResponse, VerificationResult } from './types'

/**
 * Prints the usage of this script and exits with the provided exit code.
 * @param exitCode Optional exit code to use for exit call.
 */
function printUsage(exitCode: number = 1) {
  console.log(`node verifyContract <NETWORK_NAME> <REWARD_CONTRACT_ADDRESS>`)
  process.exit(exitCode)
}

/**
 * Parses the arguments for this script and returns the populated objects necessary to perform script logic.
 * @return The ethers Contract object for the Reward smart contract in the appropriate environment.
 */
function parseArguments(): Contract {
  const args = process.argv
  if (args.length < 4) {
    printUsage()
  }

  const networkName = args[2]
  const providerURL = process.env.PROVIDER_URL
  const provider = providerURL ? new ethers.JsonRpcProvider(providerURL) : ethers.getDefaultProvider(networkName)

  const addressArg = args[3]
  const contractAddress = (addressArg.startsWith('0x') ? addressArg : `0x${addressArg}`).toLowerCase()
  if (!isAddress(contractAddress)) {
    console.log(chalk.red('Reward contract address argument must be 40 hex characters'))
    printUsage()
  }

  return new ethers.Contract(contractAddress, RewardABI, provider)
}

async function main() {
  const rewardContract: Contract = parseArguments()

  let isInvalid: boolean = false

  for (const rootPropertyName of ['pendingRewardsRoot', 'rewardsRoot']) {
    let root: string
    try {
      root = await rewardContract[rootPropertyName]()
      if (root === ZERO_BYTES32) {
        console.log(chalk.gray(`${rootPropertyName} is empty.`))
        continue
      }
    } catch (err) {
      if (!!err.code && err.code === 'BAD_DATA') {
        console.log(chalk.red(`Contract at the provided address does not exist on the provided network.`))
        process.exit(1)
      }
      console.log(chalk.red(`error: ${err}`))
      throw err
    }

    console.log(chalk.gray(`verifying ${rootPropertyName}: ${root}...`))
    const resp: VerificationResponse = await verifyRoot(root)
    const isError = isVerificationError(resp)
    if (isError) {
      console.log(chalk.red(`error verifying ${rootPropertyName} ${root}: ${(resp as VerificationError).msg}`))
      continue
    }

    const result = resp as VerificationResult
    if (result.valid) {
      console.log(chalk.green(`${rootPropertyName} ${root} is valid and all proofs exist in GitHub and are valid.`))
      console.log(
        chalk.yellow(`${rootPropertyName} ${root} makes a total of ${formatAnvil(result.leafSum)} claimable.`)
      )
    } else {
      isInvalid = true
      console.log(
        chalk.red(
          `${rootPropertyName} ${root} is invalid due to the following issues:\n${getListOfIssuesString(result)}}`
        )
      )
    }
  }

  if (isInvalid) {
    process.exit(1)
  }
}

main().catch((e) => {
  console.log(chalk.red(`caught error in main function: ${JSON.stringify(e)}`))
  throw e
})
