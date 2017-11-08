'use strict';

const http = require('http');
const async = require('async');
const aws = require('aws-sdk');
const ssh2 = require('ssh2');
const childProcess = require('child_process');

aws.config.loadFromPath('./.aws.json');


exports.getInstances = function(name, callback) {
  var ec2 = new aws.EC2();
  ec2.describeInstances({}, (error, data) => {
    if (error) return callback(error);
    const instances = [];
    data.Reservations.forEach(reservation => {
      reservation.Instances.forEach(instance => {
        if (instance.Tags[0].Value.indexOf(name) == -1) return;
        instances.push(instance);
      });
    });
    console.log('Found %s instances', instances.length);
    return callback(null, instances);
  });
}

exports.deploy = function(instances, directory, callback) {
  const tasks = instances.map(instance => callback => {
    const client = new ssh2.Client();
    client.on('ready', () => {
      const buffers = [];
      client.exec('cd ' + directory + '/ && git pull', (error, stream) => {
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

