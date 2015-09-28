/*

 The MIT License (MIT)

 Copyright (c) 2015 Telefónica Investigación y Desarrollo, S.A.U

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

module.exports = function enableTerminate(server, opts) {
  opts = opts || {};
  opts.timeout = opts.timeout || 60 * 1000;

  var connections = {};

  server.on('connection', function(conn) {
    // Save each new connection along with the number of running requests over that connection
    conn.id = conn.remoteAddress + ':' + conn.remotePort;
    connections[conn.id] = {
      conn: conn,
      runningRequests: 0
    };

    conn.on('close', function() {
      // The connection can be closed by the keep-alive timeout, or immediately on non-keep-alive connections
      delete connections[conn.id];
    });
  });

  server.on('request', function(req, res) {
    // Increase the number of running requests over the related connection
    connections[req.socket.id].runningRequests++;

    res.on('finish', function() {
      // Decrease the number of running requests over the related connection
      // (only if the socket has not been previously closed)
      if (connections[req.socket.id]) {
        connections[req.socket.id].runningRequests--;
      }
    });
  });

  server.terminate = function terminate(cb) {
    var intervalId, timeoutId;

    // Prevent the server from accepting new connections
    server.close(function onClosed(err) {
      // We get here when all the connections have been destroyed (forced or not)
      if (err) {
        return cb(err);
      }
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      cb();
    });

    // Poll the saved connections destroying those that have no running requests
    intervalId = setInterval(function() {
      for (var id in connections) {
        if (!connections[id].runningRequests) {
          connections[id].conn.destroy();
          delete connections[id];
        }
      }
    }, 1000);

    // If the timeout expires, force the destruction of all the pending connections,
    // even if they have some running requests yet
    timeoutId = setTimeout(function() {
      clearInterval(intervalId);
      for (var id in connections) {
        connections[id].conn.destroy();
        connections[id].conn.unref();
      }
    }, opts.timeout);
  };

  return server;
};
