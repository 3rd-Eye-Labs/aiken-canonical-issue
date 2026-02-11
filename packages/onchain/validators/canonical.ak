use aiken/collection/list
use cardano/transaction.{InlineDatum, Transaction}

type SomeNumber {
  number: Int,
}

// The datum that 
type CanonicalDatum {
  some_number: SomeNumber,
}

validator canonical {
  spend(
    d: Option<Data>,
    _redeemer: Data,
    _output_reference: Data,
    tx: Transaction,
  ) {
    /// Must consume some datum
    expect Some(datum) = d

    /// Expect an continuing output.
    expect Some(canonical_output) = list.at(tx.outputs, 0)
    expect InlineDatum(output_datum) = canonical_output.datum
    /// Expect the input datum to match the output datum.
    expect datum == output_datum

    True
  }

  else(_) {
    fail
  }
}
