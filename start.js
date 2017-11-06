'use strict';

const http = require('http');
const ssh2 = require('ssh2');
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
      connect((error, out) => {
        if (error) {
          console.error('Failed at prod: %s', error);
          return response.end('Crappy at prod because ' + error);

        }
        response.end('Happily deployed: ' + out);
      });
    });
  });
  server.listen(8000, () => console.log('Up and happy'));
}

function connect(callback) {
  const client = new ssh2.Client();
  client.on('ready', () => {
    const buffers = [];
    client.exec('cd ~/projects/happy/ && git pull', (error, stream) => {
      if (error) return callback(error);
      stream.on('close', () => {
        client.end();
        return callback(null, Buffer.concat(buffers));
      });
      stream.on('data', data => {
        buffers.push(data);
      });
      stream.on('error', error => {
        buffers.push(error);
      });
    });
  }).connect({
    host: '54.154.100.15',
    port: 22,
    username: 'ubuntu',
    privateKey: require('fs').readFileSync('../../.ssh/id_rsa'),
  });
}

start();

