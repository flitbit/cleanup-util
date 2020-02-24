import { expect } from 'chai';
import { iid, clearIid, getIid } from '..';

describe('Instance Id:', () => {
  describe('iid(target?, alternateName?)', () => {
    it('succeeds when target not specified', () => {
      expect(iid()).to.be.a('string');
    });
    it('successive calls without specifying target return unique values', () => {
      const count = 1000;
      const list: string[] = [];
      for (let i = 0; i < count; ++i) {
        const id = iid();
        expect(list.indexOf(id)).to.eql(-1);
        list.push(id);
      }
    });
    it('succeeds when target specified', () => {
      expect(iid({})).to.be.a('string');
    });
    it('returns the same value for the same object when successively called', () => {
      const o = {};
      expect(iid(o)).to.eql(iid(o));
    });
    it('identifies the type of the target in the returned value', () => {
      const o = {};
      expect(iid(o)).to.match(/^Object/);
      expect(iid(Buffer.from('a buffer example'))).to.match(/^Buffer/);
      expect(iid((): void => null)).to.match(/^Function/);
      expect(iid(/^some regex%/)).to.match(/^RegExp/);
      expect(!true).to.match(/^false/);
      expect(1 + 1).to.match(/^2/);
    });
    it('uses alternateName when specified', () => {
      const o = {};
      expect(iid(o, 'Function')).to.match(/^Function/);
    });
    it('returns different value for the same object after clearIid', () => {
      const o = {};
      const id = iid(o);
      expect(iid(o)).to.eql(id);
      clearIid(o);
      expect(iid(o)).to.not.eql(id);
    });
  });

  describe('getIid(target?)', () => {
    it('when target unspecified returns undefined', () => {
      expect(getIid()).to.be.undefined;
    });
    it('when target specified returns undefined if no iid', () => {
      const o = {};
      expect(getIid(o)).to.be.undefined;
    });
    it('when target specified returns defined iid', () => {
      const o = {};
      const id = iid(o);
      const id2 = getIid(o);
      expect(id2).to.eql(id);
    });
  });
  describe('clearIid(target?)', () => {
    it('when target unspecified succeeds', () => {
      expect(clearIid()).to.be.undefined;
    });
    it('when target null succeeds', () => {
      expect(clearIid(null)).to.be.undefined;
    });
    it('when target object (no iid) succeeds', () => {
      expect(clearIid({})).to.be.undefined;
    });
    it('when target specified returns defined iid', () => {
      const o = {};
      const id = iid(o);
      const id2 = clearIid(o);
      expect(id2).to.not.eql(id);
    });
  });
});
