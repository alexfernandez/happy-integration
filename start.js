'use strict';

const api = require('./api.js');
const http = require('http');
const async = require('async');
const aws = require('aws-sdk');
const ssh2 = require('ssh2');
const childProcess = require('child_process');

aws.config.loadFromPath('./.aws.json');

function start() {
  const server = http.createServer((request, response) => {
    console.log('happy');
    childProcess.exec('cd ~/projects/happy && git pull && npm test', (error, out) => {
      if (error) {
        console.error('Failed: %s', error);
        return response.end('Crappy because ' + error);
      }
      response.write('Happy at ' + request.url + ': ' + out);
      api.getInstances('happyprod', (error, instances) => {
        if (error) {
          return console.error('No instances: %s', error);
        }
        response.write('\nDeploying to ' + instances.length + ' instances\n');
        api.deploy(instances, '~/projects/happy', (error, out) => {
          if (error) {
            console.error('Failed at prod: %s', error);
            return response.end('Crappy at prod because ' + error);
          }
          response.end('Happily deployed: ' + out);
        });
      });
    });
  });
  server.listen(8000, () => console.log('Up and happy'));
}

start();

