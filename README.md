# server-terminate

![TypeScript definition](https://img.shields.io/badge/TypeScript%20Definition-%E2%9C%93-blue.svg)

Allow terminating an HTTP server in an orderly fashion:
* Immediately closes keep-alive connections that are not being used by any HTTP request. 
* Waits for running HTTP requests to finish before closing their connections.
* Closes connections with running HTTP requests after a given timeout.

If you want to destroy all open connections without waiting for HTTP requests to finish,
use the module [server-destroy](https://github.com/isaacs/server-destroy).

## Installation
```sh
npm install server-terminate
```

## Usage
```javascript
var enableTerminate = require('server-terminate');
var http = require('http');

var server = http.createServer(function onRequest(req, res) {
  // Do your stuff here
});
enableTerminate(server).listen(PORT));


// When you want to stop your server...
server.terminate(function(err, terminatedByTimeout) {
  // You get here when all connections have been closed
});
```

Or if you are using TypeScript:
```typescript
import * as http from 'http';
import enableTerminate from 'server-terminate';

let server: http.Server = http.createServer(function onRequest(req: http.ServerRequest, res: http.ServerResponse) {
    // Do your stuff here
});
enableTerminate(server).listen(PORT));

// When you want to stop your server...
server.terminate((err, terminatedByTimeout) => {
    // You get here when all connections have been closed
});
```

You can set a timeout to force connection closing even when they are still being used by running HTTP requests.
It is measured in milliseconds and defaults to 30000.
```javascript
enableTerminate(server, {timeout: 10000}).listen(PORT));
```

If the server terminates by timeout the second parameter of the callback will be `true`.

## License
MIT
