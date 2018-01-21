/*

 The MIT License (MIT)

 Copyright (c) 2015-2018 Telefónica Investigación y Desarrollo, S.A.U

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.

 */

import * as http from 'http';
import enableTerminate from '..';
import enableTerminate2 = require('..');

let server: http.Server = http.createServer(function onRequest(req: http.ServerRequest, res: http.ServerResponse) {
    res.writeHead(200);
    res.end();
});
server = enableTerminate(server);
server = enableTerminate(server, {});
server = enableTerminate(server, {timeout: 2000});
server.listen(3113);

server.terminate((err, terminatedByTimeout) => {
    // You get here when all connections have been closed
    console.log('Server terminated. terminatedByTimeout:', terminatedByTimeout);  // tslint:disable-line no-console

    server = enableTerminate2(server);
    server = enableTerminate2(server, {});
    server = enableTerminate2(server, {timeout: 2000});
    server.listen(3113);

    server.terminate((err, terminatedByTimeout) => {
        // You get here when all connections have been closed
        console.log('Server terminated2. terminatedByTimeout:', terminatedByTimeout);  // tslint:disable-line no-console
    });

});
