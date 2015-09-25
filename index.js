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

module.exports = function enableTerminate(server) {
  var connections = {};

  server.on('connection', function(conn) {
    // Save each new connection along with the number of running requests over that connection
    var key = conn.remoteAddress + ':' + conn.remotePort;
    connections[key] = {
      conn: conn,
      runningRequests: 0
    };

    conn.on('close', function() {
      // In case the connection is closed by the keep-alive timeout
      delete connections[key];
    });
  });

  server.on('request', function(req, res) {
    // Increase the number of running requests over the related connection
    var key = req.socket.remoteAddress + ':' + req.socket.remotePort;
    connections[key].runningRequests++;

    res.on('finish', function() {
      // Decrease the number of running requests over the related connection
      connections[key].runningRequests--;
    });
  });

  server.terminate = function terminate(timeout, cb) {
    if (!cb && timeout instanceof Function) {
      cb = timeout;
      timeout = 60 * 1000;
    }

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
      for (var key in connections) {
        if (!connections[key].runningRequests) {
          connections[key].conn.destroy();
          delete connections[key];
        }
      }
    }, 1000);

    // If the timeout expires, force the destruction of all the pending connections,
    // even if they have some running requests yet
    timeoutId = setTimeout(function() {
      clearInterval(intervalId);
      for (var key in connections) {
        connections[key].conn.destroy();
      }
      cb();
    }, timeout);
  };

  return server;
};
