import { iid, clearIid, getIid } from '.';

describe('Instance Id:', () => {
  describe('iid(target?, alternateName?)', () => {
    it('succeeds when target not specified', () => {
      expect(typeof iid()).toBe('string');
    });
    it('successive calls without specifying target return unique values', () => {
      const count = 1000;
      const list: string[] = [];
      for (let i = 0; i < count; ++i) {
        const id = iid();
        expect(list.indexOf(id)).toEqual(-1);
        list.push(id);
      }
    });
    it('succeeds when target specified', () => {
      expect(typeof iid({})).toBe('string');
    });
    it('returns the same value for the same object when successively called', () => {
      const o = {};
      expect(iid(o)).toEqual(iid(o));
    });
    it('identifies the type of the target in the returned value', () => {
      const o = {};
      const anon = Object.create(null);
      expect(iid(o)).toMatch(/^Object/);
      expect(iid(anon)).toMatch(/^anonymous/);
      expect(iid(Buffer.from('a buffer example'))).toMatch(/^Buffer/);
      expect(iid((): void => undefined)).toMatch(/^Function/);
      expect(iid(/^some regex%/)).toMatch(/^RegExp/);
    });
    it('uses alternateName when specified', () => {
      const o = {};
      expect(iid(o, 'Function')).toMatch(/^Function/);
    });
    it('returns different value for the same object after clearIid', () => {
      const o = {};
      const id = iid(o);
      expect(iid(o)).toEqual(id);
      clearIid(o);
      expect(iid(o)).not.toEqual(id);
    });
  });

  describe('getIid(target?)', () => {
    it('when target unspecified returns undefined', () => {
      expect(getIid()).toBeUndefined();
    });
    it('when target specified returns undefined if no iid', () => {
      const o = {};
      expect(getIid(o)).toBeUndefined();
    });
    it('when target specified returns defined iid', () => {
      const o = {};
      const id = iid(o);
      const id2 = getIid(o);
      expect(id2).toEqual(id);
    });
  });
  describe('clearIid(target?)', () => {
    it('when target unspecified succeeds', () => {
      expect(clearIid()).toBeUndefined();
    });
    it('when target null succeeds', () => {
      expect(clearIid(null)).toBeUndefined();
    });
    it('when target object (no iid) succeeds', () => {
      expect(clearIid({})).toBeUndefined();
    });
    it('when target specified returns defined iid', () => {
      const o = {};
      const id = iid(o);
      const id2 = clearIid(o);
      expect(id2).not.toEqual(id);
    });
  });
});
