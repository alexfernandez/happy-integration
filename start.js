'use strict';

const http = require('http');
const async = require('async');
const aws = require('aws-sdk');
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
      getInstances((error, instances) => {
        if (error) {
          return console.error('No instances');
        }
        deploy(instances, (error, out) => {
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

function getInstances(callback) {
  var ec2 = new aws.EC2();
  ec2.describeInstances({}, (error, data) => {
    if (error) return callback(error);
    const instances = [];
    data.Reservations.forEach(reservation => {
      reservation.Instances.forEach(instance => {
        if (instance.Tags[0].Value != 'integration') return;
        instances.push(instance);
      });
    });
    return callback(null, instances);
  });
}

function deploy(instances, callback) {
  const tasks = instances.map(instance => callback => {
    const client = new ssh2.Client();
    client.on('ready', () => {
      const buffers = [];
      client.exec('cd ~/test/ && git pull', (error, stream) => {
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
      host: instance.PublicIpAddress,
      port: 22,
      username: 'ubuntu',
      privateKey: require('fs').readFileSync('../../.ssh/id_rsa'),
    });
  });
  async.series(tasks, (error, results) => {
    callback(error, results);
  });
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

