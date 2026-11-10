import {
  isValidRead,
  readsAfterStatusChange,
  removeRead,
  replaceRead,
  statusChangePatch,
  toCalendarDay,
} from './reads';

const TODAY = '2026-11-09';
const open = (startedOn: string | null) => ({ startedOn, finishedOn: null });
const done = (startedOn: string | null, finishedOn: string) => ({ startedOn, finishedOn });

describe('toCalendarDay', () => {
  it('uses the local date, zero-padded', () => {
    expect(toCalendarDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('readsAfterStatusChange', () => {
  describe('to reading', () => {
    it('starts the first read today', () => {
      expect(readsAfterStatusChange([], 'reading', TODAY)).toEqual([open(TODAY)]);
    });

    it('keeps a read that is already open', () => {
      expect(readsAfterStatusChange([open('2026-11-01')], 'reading', TODAY)).toEqual([open('2026-11-01')]);
    });

    it('starts a re-read after a read finished on another day', () => {
      expect(readsAfterStatusChange([done('2026-01-01', '2026-02-01')], 'reading', TODAY)).toEqual([
        done('2026-01-01', '2026-02-01'),
        open(TODAY),
      ]);
    });

    it('reopens a read finished today (undoing an accidental "Read")', () => {
      expect(readsAfterStatusChange([done('2026-11-01', TODAY)], 'reading', TODAY)).toEqual([open('2026-11-01')]);
    });
  });

  describe('to read', () => {
    it('finishes the open read today', () => {
      expect(readsAfterStatusChange([open('2026-11-01')], 'read', TODAY)).toEqual([done('2026-11-01', TODAY)]);
    });

    it('records a read finished today when none is open', () => {
      expect(readsAfterStatusChange([], 'read', TODAY)).toEqual([done(null, TODAY)]);
      expect(readsAfterStatusChange([done('2025-01-01', '2025-02-01')], 'read', TODAY)).toEqual([
        done('2025-01-01', '2025-02-01'),
        done(null, TODAY),
      ]);
    });

    it('does not add a second read finished today', () => {
      expect(readsAfterStatusChange([done('2026-11-01', TODAY)], 'read', TODAY)).toEqual([done('2026-11-01', TODAY)]);
    });
  });

  describe('to want to read', () => {
    it('drops a read started today and still open', () => {
      expect(readsAfterStatusChange([done('2025-01-01', '2025-02-01'), open(TODAY)], 'wantToRead', TODAY)).toEqual([
        done('2025-01-01', '2025-02-01'),
      ]);
    });

    it('keeps older reads, open or finished', () => {
      expect(readsAfterStatusChange([open('2026-11-01')], 'wantToRead', TODAY)).toEqual([open('2026-11-01')]);
      expect(readsAfterStatusChange([done('2026-11-01', TODAY)], 'wantToRead', TODAY)).toEqual([
        done('2026-11-01', TODAY),
      ]);
    });
  });
});

describe('statusChangePatch', () => {
  it('clears the progress when a re-read starts', () => {
    const book = { reads: [done('2026-01-01', '2026-02-01')], progress: { unit: 'pages' as const, value: 300 } };
    expect(statusChangePatch(book, 'reading', TODAY)).toEqual({
      status: 'reading',
      reads: [done('2026-01-01', '2026-02-01'), open(TODAY)],
      progress: null,
    });
  });

  it('keeps the progress otherwise', () => {
    const book = { reads: [open('2026-11-01')], progress: { unit: 'pages' as const, value: 300 } };
    expect(statusChangePatch(book, 'read', TODAY)).toEqual({ status: 'read', reads: [done('2026-11-01', TODAY)] });
    expect(statusChangePatch({ reads: [], progress: null }, 'reading', TODAY)).toEqual({
      status: 'reading',
      reads: [open(TODAY)],
    });
  });
});

describe('read helpers', () => {
  it('validates the order of the dates', () => {
    expect(isValidRead(done('2026-11-01', '2026-11-09'))).toBe(true);
    expect(isValidRead(done('2026-11-09', '2026-11-09'))).toBe(true);
    expect(isValidRead(done('2026-11-10', '2026-11-09'))).toBe(false);
    expect(isValidRead(open(null))).toBe(true);
  });

  it('replaces and removes one read by position', () => {
    const reads = [done('2025-01-01', '2025-02-01'), open(TODAY)];
    expect(replaceRead(reads, 1, done(TODAY, TODAY))).toEqual([reads[0], done(TODAY, TODAY)]);
    expect(removeRead(reads, 0)).toEqual([open(TODAY)]);
  });
});
