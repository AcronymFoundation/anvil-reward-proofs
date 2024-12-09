# anvil-reward-proofs
Repository hosting Merkle Leaves and the resulting Merkle Proofs for Merkle Roots published to the Anvil Reward smart contract.

This also contains verification scripts that can verify that Merkle Proofs are valid and that Merkle Roots published to the Reward smart contract have valid proofs in this repository.

# Dependencies
NodeJS (preferably installed via nvm)
`nvm i` (if using nvm)
`npm i`

# Build
`npm run build`

# Verify a root according to proofs in GitHub
`npm run verifyRoot -- <network name here> <root here>`

Note: for the public repo, no access token will be required.

# Verify the rewards roots (pending and live) that exist in contract state
`npm run verifyContract -- <network name here> <Reward contract address here>`

Note: You may optionally provide a `PROVIDER_URL` env var to not use the default provider, which can be flaky.