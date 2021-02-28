type Action<T> = {
    fn: () => Promise<T>;
    deferred: Deferred<T>;
}

export class AsyncScheduler {
    private intervalMs: number;
    private scheduledActions: Action<any>[] = [];

    constructor(intervalMs: number) {
        this.intervalMs = intervalMs;
    }

    queue<T>(fn: () => Promise<T>): Promise<T> {
        const deferred = new Deferred<T>();
        this.scheduledActions.unshift({
            fn,
            deferred,
        });
        this.scheduledActions.unshift({
            fn: () => delay(this.intervalMs),
            deferred: new Deferred(),
        })
        return deferred.promise;
    }

    async start(): Promise<void> {
        while(this.scheduledActions.length) {
            const action = this.scheduledActions.pop()!;
            try {
                const result = await action.fn();
                action.deferred.resolve(result);
            } catch(e) {
                action.deferred.reject(e);
            }
        }
    }
}

class Deferred<T> {
    resolve!: (val: T) => void;
    reject!: (err: Error) => void;

    promise: Promise<T>;

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

async function delay(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
}