import { expect } from 'chai';
import { EventEmitter } from 'events';
import { cleanupPropagationEvent, addCleanupTask } from '../src';

const delay = async (ms: number): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

describe('.cleanupPropagationEvent(sender, listener, target, event, reciprocal?)', () => {
  it('throws when sender not specified', () => {
    expect(() => cleanupPropagationEvent(undefined, undefined, undefined, undefined)).to.throw(
      'sender (object) is required'
    );
  });
  it('throws when event not specified', () => {
    const sender = new EventEmitter();
    expect(() => cleanupPropagationEvent(sender, undefined, undefined, undefined)).to.throw(
      'event (string) is required'
    );
  });

  it('throws when listener not specified', () => {
    const sender = new EventEmitter();
    const event = 'close';
    expect(() => cleanupPropagationEvent(sender, event, undefined, undefined)).to.throw('listener (func) is required');
  });
  it('throws when target not specified', () => {
    const sender = new EventEmitter();
    const event = 'close';
    const listener = (): void => null;
    expect(() => cleanupPropagationEvent(sender, event, listener, undefined)).to.throw('target (object) is required');
  });
  it('succeeds when required args specified', () => {
    const observations: string[] = [];
    const sender = new EventEmitter();
    const listener = (): void => {
      observations.push('listener');
    };
    const target = new EventEmitter();
    const event = 'close';
    cleanupPropagationEvent(sender, event, listener, target);
  });
  it('causes listener to be called on the specified sender event', () => {
    const observations: string[] = [];
    const sender = new EventEmitter();
    const listener = (): void => {
      observations.push('listener');
    };
    const target = new EventEmitter();
    const event = 'close';
    cleanupPropagationEvent(sender, event, listener, target);
    sender.emit(event);
    expect(observations).to.contain('listener');
  });
  it('reciprocal event causes cleanup', async () => {
    const observations: string[] = [];
    const sender = new EventEmitter();
    const listener = (): void => {
      observations.push('listener');
    };
    const target = new EventEmitter();
    const event = 'cancel';
    const reciprocal = 'close';
    cleanupPropagationEvent(sender, event, listener, target, reciprocal);
    addCleanupTask(sender, target, () => {
      observations.push('cleanup');
    });
    target.emit(reciprocal);
    // reciprocal event cleanup scheduled in background using setImmediate,
    // so let the event loop run...
    await delay(100);
    expect(observations).to.not.contain('listener');
    expect(observations).to.contain('cleanup');
  });
  it('throws when cleanup propagation duplicated', () => {
    const sender = new EventEmitter();
    const listener = (): void => null;
    const target = new EventEmitter();
    const event = 'close';
    cleanupPropagationEvent(sender, event, listener, target);
    expect(() => cleanupPropagationEvent(sender, event, listener, target)).to.throw(
      /^Invalid operation; cleanup propagation already setup between/
    );
  });
  it('detects memory leak when cleanup target never performs cleanup', async () => {
    const observations: string[] = [];
    const sender = new EventEmitter();
    const listener = (): void => null;
    const target = new EventEmitter();
    const event = 'close';
    cleanupPropagationEvent(sender, event, listener, target, event);
    const target2 = new EventEmitter();
    cleanupPropagationEvent(sender, event, listener, target2);
    sender.once('error', (e: Error): void => {
      observations.push(e.message);
    });
    target.emit(event);
    // reciprocal event cleanup scheduled in background using setImmediate,
    // so let the event loop run...
    await delay(100);
    expect(observations.length).to.eql(1);
    expect(observations[0]).to.match(/^Memory leak detected: EventEmitter/);
  });
});

describe('.addCleanupTask(sender, listener, task)', () => {
  it('throws when sender not specified', () => {
    expect(() => addCleanupTask(undefined, undefined, undefined)).to.throw('sender (object) is required');
  });
  it('throws when target not specified', () => {
    expect(() => addCleanupTask(new EventEmitter(), undefined, undefined)).to.throw('target (object) is required');
  });
  it('throws when task not specified', () => {
    expect(() => addCleanupTask(new EventEmitter(), {}, undefined)).to.throw('task (func) is required');
  });
  it('throws when cleanup propagation not setup for sender', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    expect(() => addCleanupTask(new EventEmitter(), {}, (): void => { })).to.throw(
      /^Invalid operation: no cleanup propagation on EventEmitter/
    );
  });
  it('throws when cleanup propagation not setup between sender and target', () => {
    const sender = new EventEmitter();
    const listener = (): void => null;
    const target = new EventEmitter();
    const event = 'close';
    cleanupPropagationEvent(sender, event, listener, target);
    expect(() => addCleanupTask(sender, {}, () => null)).to.throw(
      /^Invalid operation: no cleanup propagation setup between EventEmitter/
    );
  });
});
