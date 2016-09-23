/**
 * Allow terminating an HTTP server in an orderly fashion
 */
import { Server } from 'http';

interface enableTerminateSignature {
    /** Adds the `terminate` function to the provided server instance */
    (server: Server, opts?: Options): Server;
    default: enableTerminateSignature;
}

declare var enableTerminate: enableTerminateSignature;
export = enableTerminate;

interface Options {
    timeout?: number;
}

declare module 'http' {
    export interface Server {
        /**
         * Terminates the server in an orderly fashion by
         *  - closing keep-alive connections that are not being used by any HTTP request.
         *  - waiting for running HTTP requests to finish before closing their connections.
         *  - closing connections with running HTTP requests after the provided timeout
         */
        terminate(cb: (err: Error, terminatedByTimeout: boolean) => any): Server;
    }
}
