/*

 The MIT License (MIT)

 Copyright (c) 2015-2016 Telefónica Investigación y Desarrollo, S.A.U

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

'use strict';

module.exports = enableTerminate;
// Support for ES6 imports.
// Now you can make `import enableTerminate from 'enable-terminate'`
// and get a reference to this function
enableTerminate.default = enableTerminate;

function enableTerminate(server, opts) {
  opts = opts || {};
  opts.timeout = opts.timeout || 30 * 1000;

  var connections = {};
  var terminating = false;
  var terminatedByTimeout = false;

  server.on('connection', function onConnection(conn) {
    // Save each new connection along with the number of running requests over that connection
    conn.id = conn.remoteAddress + ':' + conn.remotePort;
    connections[conn.id] = {
      conn: conn,
      runningRequests: 0
    };

    conn.on('close', function onClose() {
      // The connection can be closed by the keep-alive timeout, or immediately on non keep-alive connections
      delete connections[conn.id];
    });
  });

  server.on('request', function onRequest(req, res) {
    // Increase the number of running requests over the related connection
    connections[req.socket.id].runningRequests++;

    res.on('finish', function onFinish() {
      // Decrease the number of running requests over the related connection
      // (only if the socket has not been previously closed)
      if (connections[req.socket.id]) {
        connections[req.socket.id].runningRequests--;
        // If this event happens after the "terminate" function has been invoked, it means that we are waiting
        // for running requests to finish, so close the connection as soon as the requests finish
        if (terminating && !connections[req.socket.id].runningRequests) {
          connections[req.socket.id].conn.destroy();
          delete connections[req.socket.id];
        }
      }
    });
  });

  server.terminate = function terminate(cb) {
    terminating = true;
    var timeoutId;

    // Prevent the server from accepting new connections
    server.close(function(err) {
      // We get here when all the connections have been destroyed (forced or not)
      if (err) {
        return cb(err);
      }
      clearTimeout(timeoutId);
      cb(null, terminatedByTimeout);
    });

    // Destroy open connections that have no running requests
    Object.keys(connections).forEach(function(id) {
      if (!connections[id].runningRequests) {
        connections[id].conn.destroy();
        delete connections[id];
      }
    });

    // If the timeout expires, force the destruction of all the pending connections,
    // even if they have some running requests yet
    timeoutId = setTimeout(function() {
      terminatedByTimeout = true;
      Object.keys(connections).forEach(function(id) {
        connections[id].conn.destroy();
        delete connections[id];
      });
    }, opts.timeout);
  };

  return server;
}
