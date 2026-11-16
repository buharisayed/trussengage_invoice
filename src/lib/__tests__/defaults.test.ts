import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createDocumentFromSettings,
  createEmptyLineItem,
  formatDocNumber,
  getDefaultSettings,
} from "../defaults.ts";

describe("defaults helpers", () => {
  it("formats document numbers with 4-digit zero padding", () => {
    assert.equal(formatDocNumber("INV-", 1), "INV-0001");
    assert.equal(formatDocNumber("QUO-", 1002), "QUO-1002");
  });

  it("creates an empty line item with defaults", () => {
    const item = createEmptyLineItem();
    assert.ok(item.id.length > 0);
    assert.equal(item.quantity, 1);
    assert.equal(item.rate, 0);
    assert.equal(item.unit, "pcs");
  });

  it("creates invoice and quotation documents from settings", () => {
    const settings = getDefaultSettings();
    const inv = createDocumentFromSettings("invoice", settings);
    assert.equal(inv.type, "invoice");
    assert.equal(inv.title, "INVOICE");
    assert.equal(inv.documentNumber, "INV-1002");
    assert.equal(inv.paymentDetails, settings.defaultPaymentDetails);

    const quo = createDocumentFromSettings("quotation", settings);
    assert.equal(quo.type, "quotation");
    assert.equal(quo.title, "QUOTATION");
    assert.equal(quo.documentNumber, "QUO-1002");
    assert.equal(quo.paymentDetails, "");
  });
});
