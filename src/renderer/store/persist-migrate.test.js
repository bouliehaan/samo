import { describe, expect, it } from 'vitest';
import { identityPersistMigrate, PERSIST_VERSION_INITIAL } from './persist-migrate';
describe('identityPersistMigrate', () => {
    it('returns persisted state unchanged', () => {
        const persisted = { resumeByItemId: { 'item-1': 42 } };
        const migrated = identityPersistMigrate(persisted, PERSIST_VERSION_INITIAL);
        expect(migrated).toEqual(persisted);
    });
});
