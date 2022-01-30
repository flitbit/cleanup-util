import * as assert from 'assert-plus';
import dbg from 'debug';
import { EventEmitter } from 'events';

const debug = dbg.debug('cleanup-util');

const $cleanup = Symbol('cleanup');
const $iid = Symbol('$');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Listener = (...args: any[]) => void;
export type Task = () => void;

interface Cleanup extends EventEmitter {
  [$cleanup]?: Record<string, Task[]>;
  [$iid]?: string;
}

let _id = 0;
const unique = (): string => (++_id).toString(16).padStart(6, '0');

/**
 * Creates a unique identity for the specified target. If no target is specified then a the next unique identity is returned as a string of hexidecimal characters.
 *
 * Identities are sequential numbers represented as hexidecimal strings. If a target is specified, the target's class name is prepended to the identity so that identities read well as strings.
 * @param target the target object
 * @param alternateName an alternate name for the object
 */
export const iid = <T>(target?: T, alternateName?: string): string => {
  if (target === undefined || target === null) {
    return `i${unique()}`;
  }
  const s = target as unknown as Cleanup;
  if (typeof s[$iid] === 'undefined') {
    if (alternateName) {
      s[$iid] = `${alternateName} i${unique()}`;
    } else if (s.constructor) {
      s[$iid] = `${s.constructor.name} i${unique()}`;
    } else {
      s[$iid] = `anonymous i${unique()}`;
    }
  }
  return s[$iid] as string;
};

export const clearIid = <T>(target?: T): void => {
  if (target === undefined || target === null) {
    return;
  }
  const s = target as unknown as Cleanup;
  if (s[$iid]) {
    delete s[$iid];
  }
};

export const getIid = <T>(target?: T): string | undefined => {
  if (target === undefined || target === null) {
    return undefined;
  }
  const s = target as unknown as Cleanup;
  return s[$iid];
};

export function addCleanupTask<S extends EventEmitter, T>(
  sender: S,
  target: T,
  task: Task,
): void {
  assert.object(sender, 'sender');
  assert.object(target, 'target');
  assert.func(task, 'task');
  const s = sender as unknown as Cleanup;
  const senderId = iid(sender);
  if (!s[$cleanup]) {
    throw Error(`Invalid operation: no cleanup propagation on ${senderId}.`);
  }
  const targetId = iid(target);
  if (targetId) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (!s[$cleanup]![targetId]) {
      throw Error(
        `Invalid operation: no cleanup propagation setup between ${senderId} and ${targetId}.`,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    s[$cleanup]![targetId].push(task);
    debug(
      `${senderId}: cleanup hook ${iid(s[$cleanup])} added task ${iid(task)}`,
    );
  }
}

export function cleanupPropagationEvent<T extends EventEmitter>(
  sender: T,
  event: string,
  listener: Listener,
  target: EventEmitter,
  reciprocal?: string,
): void {
  assert.object(sender, 'sender');
  assert.string(event, 'event');
  assert.func(listener, 'listener');
  assert.object(target, 'target');
  const s = sender as unknown as Cleanup;
  const senderId = iid(sender);
  const targetId = iid(target);
  if (targetId) {
    let origin = false;
    if (!s[$cleanup]) {
      s[$cleanup] = {};
      origin = true;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    } else if (s[$cleanup]![targetId]) {
      throw new Error(
        `Invalid operation; cleanup propagation already setup between ${senderId} and ${targetId}.`,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    s[$cleanup]![targetId] = [];
    const cleanup = (): void => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (s[$cleanup] && s[$cleanup]![targetId]) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const tasks = s[$cleanup]![targetId];
        const len = tasks.length;
        let i = len;
        while (--i > -1) {
          const task = tasks[i];
          debug(
            `${iid(s)}: cleanup hook ${targetId} running task ${iid(task)}`,
          );
          task();
        }
        debug(`${iid(s)}: cleanup hook ${targetId} done`);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        delete s[$cleanup]![targetId];
      }
      if (origin) {
        setImmediate(() => {
          if (s[$cleanup]) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const keys = Object.keys(s[$cleanup]!);
            if (keys.length) {
              sender.emit(
                'error',
                new Error(
                  `Memory leak detected: ${senderId} was not cleaned up by [${keys.join(
                    ',',
                  )}]`,
                ),
              );
            }
            delete s[$cleanup];
          }
        });
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (...args: any[]): void => {
      listener.call(sender, args);
      debug(`${iid(s)}: cleanup hook ${targetId} called`);
      cleanup();
    };
    sender.on(event, handler);
    debug(`${iid(s)}: cleanup hook ${targetId} hooked`);
    addCleanupTask(s, target, () => {
      debug(`${iid(s)}: cleanup hook ${targetId} unhooked`);
      target.removeListener(event, handler);
    });
    // it is possible for the reciprocal event to have a different name.
    if (reciprocal) {
      const reciprocalEvent = (): void => {
        setImmediate(cleanup);
        debug(
          `${iid(s)}: cleanup hook ${targetId} scheduled via reciprocal event}`,
        );
      };
      target.once(reciprocal, reciprocalEvent);
      debug(`${iid(s)}: cleanup hook ${targetId} added reciprocal event`);
      addCleanupTask(s, target, () => {
        debug(
          `${iid(s)}: cleanup hook ${targetId} removing reciprocal event hook`,
        );
        target.removeListener(reciprocal, reciprocalEvent);
      });
    }
  }
}
