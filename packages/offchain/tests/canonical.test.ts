import {
  addAssets,
  credentialToAddress,
  Data,
  Emulator,
  EmulatorAccount,
  generateEmulatorAccount,
  Lucid,
  LucidEvolution,
  TxBuilder,
  validatorToScriptHash,
} from '@lucid-evolution/lucid';
import { beforeEach, expect, it } from 'vitest';
import {
  CanonicalDatum,
  mkValidator,
  serialiseCanonicalDatum,
} from '../src/index.js';

type EmulatorAccountMap = Record<string, EmulatorAccount>;

type LucidContext<T extends EmulatorAccountMap = EmulatorAccountMap> = {
  lucid: LucidEvolution;
  users: T;
  emulator: Emulator;
};

export async function createTestContext(context: LucidContext): Promise<void> {
  context.users = {
    user: generateEmulatorAccount(
      addAssets({ lovelace: 100_000_000_000_000n }),
    ),
  };

  context.emulator = new Emulator([context.users.user]);

  context.lucid = await Lucid(context.emulator, 'Custom');
  context.lucid.selectWallet.fromSeed(context.users.user.seedPhrase);
}

async function runAndAwaitTxBuilder(
  lucid: LucidEvolution,
  transaction: TxBuilder,
  extraSigners: string[] = [],
  canonical: boolean = false,
): Promise<string> {
  const bTx = await transaction.complete({ canonical });

  const signatures = [await bTx.partialSign.withWallet()];
  for (const signer of extraSigners) {
    lucid.selectWallet.fromSeed(signer);
    signatures.push(await lucid.fromTx(bTx.toCBOR()).partialSign.withWallet());
  }

  const signedTx = bTx.assemble(signatures);

  const txHash = await signedTx.complete().then((tx) => tx.submit());

  await lucid.awaitTx(txHash);
  return txHash;
}

beforeEach<LucidContext>(async (context: LucidContext) => {
  await createTestContext(context);
});

it('Non-canonical input vs. canonical output', async (context: LucidContext) => {
  const { lucid } = context;
  const validator = mkValidator();
  const scriptAddress = credentialToAddress(lucid.config().network!, {
    hash: validatorToScriptHash(validator),
    type: 'Script',
  });

  const canonicalDatum: CanonicalDatum = { some_number: { number: 1n } };
  const datumCanonical = serialiseCanonicalDatum(canonicalDatum, true);
  const datumNonCanonical = serialiseCanonicalDatum(canonicalDatum, false);

  expect(datumCanonical).not.toEqual(datumNonCanonical);

  await runAndAwaitTxBuilder(
    lucid,
    lucid
      .newTx()
      .pay.ToContract(
        scriptAddress,
        { kind: 'inline', value: datumNonCanonical },
        { lovelace: 5_000_000n },
      ),
  );

  const [utxo] = await lucid.utxosAt(scriptAddress);

  await runAndAwaitTxBuilder(
    lucid,
    lucid
      .newTx()
      .collectFrom([utxo], Data.void())
      .attach.SpendingValidator(validator)
      .pay.ToContract(
        scriptAddress,
        { kind: 'inline', value: datumCanonical },
        { lovelace: 5_000_000n },
      ),
  );
});
