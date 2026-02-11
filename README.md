# Aiken Canonical Datum Issue

This project demonstrates an issue with Aiken validators where equality checks between datums fail when comparing canonical and non-canonical CBOR representations of the same data.

## Overview

Aiken validators currently do not support checking equality while ignoring the CBOR data representation (canonical vs. non-canonical). This means that even though two datums represent the same logical data, they will be considered unequal if one is encoded in canonical CBOR format and the other is not.

## Project Structure

This project consists of two packages:

### `packages/onchain`
A simple Aiken validator (`canonical.ak`) that checks that the input datum matches the continuing output datum. The validator uses a direct equality check (`expect datum == output_datum`) which fails when comparing canonical and non-canonical representations of the same data.

### `packages/offchain`
Contains a test suite that demonstrates the issue:
1. Creates a UTxO at the script address with a **non-canonical** datum
2. Attempts to consume that output with a continuing datum that is **canonical**

The test will fail with the trace: `"Expect the input datum to match the output datum."`

## Building and Running

To build and run the test:

1. Navigate to the `packages/offchain` directory:
   ```bash
   cd packages/offchain
   ```

2. Install dependencies:
   ```bash
   pnpm i
   ```

3. Run the test:
   ```bash
   pnpm test
   ```

The test will fail, demonstrating that the Aiken validator cannot match datums that have the same logical content but different CBOR encodings.

## Test Details

The test (`canonical.test.ts`) works as follows:

1. **Create a UTxO with non-canonical datum**: An output is created at the script address with a datum serialized in non-canonical CBOR format (`datumN`).

2. **Attempt to consume with canonical datum**: The test attempts to consume that UTxO and create a continuing output with the same logical datum, but serialized in canonical CBOR format (`datumC`).

3. **Validation fails**: The Aiken validator's equality check (`datum == output_datum`) fails because the CBOR representations differ, even though they represent identical data.

## Expected Behavior

The test is expected to succeed, as we'd expect Aiken to ignore the comparison of the raw CBOR bytes, and instead compart the logical content of the data.

## Related Files

- **Validator**: `packages/onchain/validators/canonical.ak` - The Aiken validator that performs the equality check
- **Test**: `packages/offchain/tests/canonical.test.ts` - The test that demonstrates the issue
- **Serialization**: `packages/offchain/src/index.ts` - Contains the `serialiseCanonicalDatum` function that can serialize datums in canonical or non-canonical format

