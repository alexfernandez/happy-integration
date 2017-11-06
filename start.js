'use strict';

const http = require('http');
const childProcess = require('child_process');

function start() {
  const server = http.createServer((request, response) => {
    console.log('happy');
    childProcess.exec('cd ~/projects/happy && git pull && npm test', (error, out) => {
      if (error) {
        console.error('Failed: %s', error);
        return response.end('Crappy because ' + error);
      }
      response.end('Happy at ' + request.url + ': ' + out);
    });
  });
  server.listen(8000, () => console.log('Up and happy'));
}

start();

