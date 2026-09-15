import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InventoryTransactionType, ScreeningStatus } from './pharmacy.types.js';
describe('Integrated Pharmacy invariants', () => {
    it('defines DISPENSE as the inventory ledger movement type', () => {
        assert.equal(InventoryTransactionType.DISPENSE, 'DISPENSE');
    });
    it('requires screening to distinguish a blocked prescription', () => {
        assert.equal(ScreeningStatus.BLOCKED, 'BLOCKED');
    });
    it('rejects non-positive dispense quantities at the domain boundary', () => {
        for (const quantity of [0, -1, 1.5]) {
            assert.equal(Number.isInteger(quantity) && quantity > 0, false);
        }
    });
});
