import * as http from 'http';

export default function enableTerminate(server: http.Server, opts?: Options): http.Server;

interface Options {
    timeout?: number;
}

declare module 'http' {
    export interface Server {
        terminate(cb: (err: Error, terminatedByTimeout: boolean) => void): Server;
    }
}
