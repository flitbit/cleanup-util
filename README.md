# cleanup-util &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/flitbit/cleanup-util/blob/master/LICENSE)
> Utility for cleaning up event handlers

**cleanup-util** is a small, utility for tracking and cleaning up event handlers. I find this utility useful when I have classes derived from EventHandler that are used throughout the life of my applications and those EventHandlers frequently have event handlers added and removed. It helps me catch memory leaks from dangling event listeners early in the development process.  I hope you find it useful.

## Installing / Getting started

**cleanup-util** is installed using npm:

```shell
npm install -S cleanup-util
```

In the above command we install **cleanup-util** into the local project, updating the dependencies in the `project.json` file.

## API

### cleanupPropagationEvent

```ts
function cleanupPropagationEvent<T extends EventEmitter>(
  sender: T,
  event: string,
  listener: Listener,
  target: EventEmitter,
  reciprocal?: string
): void
```

Attaches the specified `listener` to the specified `sender`, wrapping the `listener` to track it's cleanup.

If `reciprocal` is specified, it is the name of an event on `target`, **cleanup-util** will attach an event handler to the target to cleanup in the background if necessary.

### addCleanupTask

```ts
function addCleanupTask<S extends EventEmitter, T>(sender: S, target: T, task: Task): void
```

Adds a task to be run when the cleanup propagation event occurs.

### iid(target)

Associates an instance Id with a target object.

### getIid(target)

Gets the instance Id associated with an object.

### clearId

Clears the instance Id associated with an object.

## Tests

Tests are built using [Mocha](https://mochajs.org/) and chai.

```shell
npm test
```

## Licensing

This project is licensed by the MIT license found in this repository's root.
