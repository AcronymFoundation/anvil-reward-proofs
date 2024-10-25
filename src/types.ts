export type VerificationResponse = VerificationResult | VerificationError
export function isVerificationError(resp: VerificationResponse): boolean {
  return (resp as VerificationResult).valid === undefined
}

interface Leaf {
  amount: string
  address: string
}

export interface ProofNotFound extends Leaf {
  atUrl: string
}

export interface ProofAmountMismatch extends Leaf {
  atUrl: string
  amountAtUrl: string
}

export interface ProofInvalid extends Leaf {
  atUrl: string
  proof: string[]
}

export interface VerificationResult {
  valid: boolean
  leafSum: bigint
  leavesThatWereNotFound: ProofNotFound[]
  leavesWithAmountMismatch: ProofAmountMismatch[]
  leavesWithProofInvalid: ProofInvalid[]
}

export interface VerificationError {
  msg: string
}

/**
 * Simple factory for the `VerificationError` object.
 */
export function verificationError(msg: string): VerificationError {
  return { msg }
}

/**
 * Simple factory for the `VerificationResult` object.
 */
export function verificationResult(
  valid: boolean,
  leafSum: bigint = 0n,
  leavesThatWereNotFound: ProofNotFound[] = [],
  leavesWithAmountMismatch: ProofAmountMismatch[] = [],
  leavesWithProofInvalid: ProofInvalid[] = []
): VerificationResult {
  return {
    valid,
    leafSum,
    leavesThatWereNotFound,
    leavesWithAmountMismatch,
    leavesWithProofInvalid
  }
}
