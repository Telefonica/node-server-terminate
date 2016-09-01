import * as http from 'http';

declare function enableTerminate(server: http.Server, opts?: Options): http.Server;
export = enableTerminate;

interface Options {
    timeout?: number;
}

declare module 'http' {
    export interface Server {
        terminate(cb: (err: Error, terminatedByTimeout: boolean) => void): Server;
    }
}
