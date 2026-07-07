import bundle from './migrations';

describe('migrations bundle', () => {
  it('has an m<idx>-keyed SQL string for every journal entry', () => {
    for (const entry of bundle.journal.entries) {
      const key = `m${entry.idx.toString().padStart(4, '0')}`;
      const sql = bundle.migrations[key];
      expect(sql).toBeTruthy();
      expect(typeof sql).toBe('string');
    }
  });
});
