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
server.listen(8080);

server.terminate((err, terminatedByTimeout) => {
    // You get here when all connections have been closed
    console.log('Server terminated. terminatedByTimeout:', terminatedByTimeout);  // tslint:disable-line no-console

    server = enableTerminate2(server);
    server = enableTerminate2(server, {});
    server = enableTerminate2(server, {timeout: 2000});
    server.listen(8080);

    server.terminate((err, terminatedByTimeout) => {
        // You get here when all connections have been closed
        console.log('Server terminated2. terminatedByTimeout:', terminatedByTimeout);  // tslint:disable-line no-console
    });

});
