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

var expect = require('chai').expect;
var http = require('http');
var enableTerminate = require('./index');

var PORT = 3113;

function hr2ms(duration) {
  return duration[0] * 1000 + duration[1] / 1e6;
}

feature('Setup', function() {
  scenario('Invoke "enableTerminate" over an HTTP server', function() {
    var server,
        returnedServer;

    given('that I have an HTTP server', function() {
      server = http.createServer();
    });
    when('I call the "enableTerminate" function over such a server', function() {
      returnedServer = enableTerminate(server);
    });
    then('The server has a "terminate" function', function() {
      expect(returnedServer).to.respondTo('terminate');
    });
    and('The "enableTerminate" function returns the server', function() {
      expect(returnedServer).to.deep.equal(server);
    });
  });
});

feature('Terminate an HTTP server', function() {
  var dataset;

  scenario('No requests have been performed yet against the server', function() {
    var server,
        duration;

    given('that I have an HTTP server with the "terminate" function', function(done) {
      server = enableTerminate(http.createServer(function onRequest(req, res) {
        res.writeHead(200);
        res.end();
      }).listen(PORT, done));
    });
    and('No requests have been performed yet against the server', function() {
      // noop
    });
    when('I terminate the server', function(done) {
      var start = process.hrtime();
      server.terminate(function() {
        duration = process.hrtime(start);
        done();
      });
    });
    then('It is immediately closed', function() {
      expect(hr2ms(duration)).to.be.below(10);
    });
  });

  dataset = [
    {desc: 'the client sends the "Connection: close" header', serverClose: false, clientClose: true},
    {desc: 'the server sends the "Connection: close" header', serverClose: true, clientClose: false},
    {desc: 'the server closes the connection after the keep-alive timeout', serverClose: false, clientClose: false}
  ];
  scenario('Some requests have been completed and their connections have been closed', dataset, function(variant) {
    var server,
        duration;

    given('that I have an HTTP server with the "terminate" function', function(done) {
      server = enableTerminate(http.createServer(function onRequest(req, res) {
        setImmediate(function() {
          if (variant.serverClose) {
            res.shouldKeepAlive = false;
          }
          res.writeHead(200);
          res.end();
        });
      }).listen(PORT, done));
      server.timeout = 3000;  // keep-alive timeout
    });
    and('Some requests have been performed against the server and their connections have been closed', function(done) {
      var opts = {
        method: 'GET',
        host: 'localhost',
        port: PORT,
        agent: variant.clientClose ? false : http.GlobalAgent
      };
      var req = http.request(opts, function onResponse(res) {
        // We are not interested on the response but this callback in needed to avoid the connection to be closed
      });
      req.on('error', done);
      req.on('socket', function onSocket(socket) {
        socket.on('close', function onClose() {
          done();
        });
      });
      req.end();
    });
    when('I terminate the server', function(done) {
      var start = process.hrtime();
      server.terminate(function() {
        duration = process.hrtime(start);
        done();
      });
    });
    then('It is immediately closed', function() {
      expect(hr2ms(duration)).to.be.below(10);
    });
  });

  scenario('Some requests have been completed but their connections are still open', function() {
    var server,
        duration;

    given('that I have an HTTP server with the "terminate" function', function(done) {
      server = enableTerminate(http.createServer(function onRequest(req, res) {
        setImmediate(function() {
          res.writeHead(200);
          res.end();
        });
      }).listen(PORT, done));
    });
    and('Some requests have been performed against the server ' +
        'but their connections have not been closed yet', function(done) {
      var opts = {
        method: 'GET',
        host: 'localhost',
        port: PORT,
        agent: http.GlobalAgent
      };
      var req = http.request(opts, function onResponse(res) {
        done();
      });
      req.on('error', done);
      req.end();
    });
    when('I terminate the server', function(done) {
      var start = process.hrtime();
      server.terminate(function() {
        duration = process.hrtime(start);
        done();
      });
    });
    then('It is immediately closed', function() {
      expect(hr2ms(duration)).to.be.below(10);
    });
  });

  scenario('There are running requests', function() {
    var DELAY = 2000,
        server,
        duration;

    given('that I have an HTTP server with the "terminate" function', function(done) {
      server = enableTerminate(http.createServer(function onRequest(req, res) {
        setTimeout(function() {
          res.writeHead(200);
          res.end();
        }, DELAY);
      }).listen(PORT, done));
    });
    and('Some requests have been sent against the server ' +
        'but their responses have not been received yet', function(done) {
      var opts = {
        method: 'GET',
        host: 'localhost',
        port: PORT,
        agent: http.GlobalAgent
      };
      var req = http.request(opts);
      req.on('error', done);
      req.end();
      setTimeout(done, DELAY / 2);
    });
    when('I terminate the server', function(done) {
      var start = process.hrtime();
      server.terminate(function() {
        duration = process.hrtime(start);
        done();
      });
    });
    then('It waits for the running requests to finish', function() {
      expect(hr2ms(duration)).to.be.closeTo(DELAY - (DELAY / 2), 50);
    });
  });

  dataset = [
    {desc: 'Exit without waiting for the request handler to finish', waitForRequestHandler: false},
    {desc: 'Wait for the request handler to finish before exiting', waitForRequestHandler: true}
  ];
  scenario('There are running requests that take longer than the configured timeout', dataset, function(variant) {
    var TIMEOUT = 1000,
        server,
        duration,
        error,
        terminatedByTimeout;

    given('that I have an HTTP server with the "terminate" function configured with a timeout', function(done) {
      server = enableTerminate(http.createServer(function onRequest(req, res) {
        setTimeout(function() {
          res.writeHead(200);
          res.end();
        }, TIMEOUT * 2);
      }).listen(PORT, done), {timeout: TIMEOUT});
    });
    and('Some requests have been sent against the server ' +
        'but their responses have not been received yet', function(done) {
      var opts = {
        method: 'GET',
        host: 'localhost',
        port: PORT,
        agent: http.GlobalAgent
      };
      var req = http.request(opts);
      req.on('error', function onError(err) {
        // Catch the "socket hang up" error
        error = err;
      });
      req.end();
      setTimeout(done, TIMEOUT / 2);
    });
    when('I terminate the server', function(done) {
      var start = process.hrtime();
      server.terminate(function(err, terminatedByTimeout_) {
        duration = process.hrtime(start);
        terminatedByTimeout = terminatedByTimeout_;
        done();
      });
    });
    if (variant.waitForRequestHandler) {
      and('I wait for the server request handler to finish', function(done) {
        setTimeout(done, TIMEOUT * 2 + 500);
      });
    }
    then('It waits for the running request to finish or the timeout expires', function() {
      expect(hr2ms(duration)).to.be.closeTo(TIMEOUT, 50);
      expect(error).to.have.property('code', 'ECONNRESET');
    });
    and('and terminatedByTimeout parameter is true', function() {
      expect(terminatedByTimeout).to.be.true;
    });
  });

});
