#!/usr/bin/env node

'use strict';

// windows: running "xible x" in this folder will invoke WSH, not node.
/* global WScript*/
if (typeof WScript !== 'undefined') {
  WScript.echo(
    'npm does not work when run\n' +
    'with the Windows Scripting Host\n\n' +
    "'cd' to a different directory,\n" +
    "or type 'npm.cmd <args>',\n" +
    "or type 'node npm <args>'."
  );
  WScript.quit(1);
  return;
}

process.title = 'xible';

// start with debug logging enabled until we have a 'normal' way of logging
process.env.DEBUG = 'xible*';

const fs = require('fs');
const nopt = require('nopt');
const Xible = require('./index.js');

// option parsing
const knownOpts = {
  config: String,
  user: String,
  group: String
};
const shortHands = {
  c: '--config',
  u: '--user',
  g: '--group'
};
const opts = nopt(knownOpts, shortHands);
const remain = opts.argv.remain;
const context = remain.shift() || 'help';
const command = remain.shift();
const ARG = remain.shift();

// get the config path for XIBLE
const CONFIG_PATH = opts.config || '~/.xible/config.json';

function logError(msg, exitCode) {
  console.error(msg);
  process.exitCode = exitCode || 1;
}

// cli commands
const cli = {

  flow: {

    start() {
      return Promise.reject('Not implemented yet');
    },
    stop() {
      return Promise.reject('Not implemented yet');
    }

  },

  service: {
    // TODO: support windows
    install() {
      return new Promise((resolve, reject) => {
        fs.readFile(`${__dirname}/xible.service`, 'utf8', (err, xibleServiceContents) => {
          if (err) {
            reject(`Failed to install service: ${err}`);
            return;
          }

          const user = opts.user || process.env.SUDO_USER || process.env.USER || 'root';
          const group = opts.group || opts.user || process.env.SUDO_USER || process.env.USER || 'root';

          // set the user and group for the service
          xibleServiceContents = xibleServiceContents.replace(/\$user/g, user);
          xibleServiceContents = xibleServiceContents.replace(/\$group/g, group);

          // save the service
          fs.writeFile('/etc/systemd/system/xible.service', xibleServiceContents, (writeServiceErr) => {
            if (writeServiceErr) {
              reject(`Failed to install service: ${writeServiceErr}`);
              return;
            }
            console.log(`Service installed with User="${user}" and Group="${group}".`);
            resolve();
          });
        });
      });
    },
    remove() {
      return new Promise((resolve, reject) => {
        fs.unlink('/etc/systemd/system/xible.service', (err) => {
          if (err) {
            reject(`Failed to remove service: ${err}`);
            return;
          }
          console.log('Service removed.');
          resolve();
        });
      });
    },
    start() {
      return new Promise((resolve, reject) => {
        const exec = require('child_process').exec;
        exec('systemctl start xible.service', (err) => {
          if (err) {
            reject(`Failed to start service: ${err}`);
            return;
          }
          console.log('Service started.');
          resolve();
        });
      });
    },
    stop() {
      return new Promise((resolve, reject) => {
        const exec = require('child_process').exec;
        exec('systemctl stop xible.service', (err) => {
          if (err) {
            reject(`Failed to stop service: ${err}`);
            return;
          }
          console.log('Service stopped.');
          resolve();
        });
      });
    },
    status() {
      return new Promise((resolve) => {
        const exec = require('child_process').exec;
        exec('systemctl show xible.service -p ActiveState', (err, stdout) => {
          if (err) {
            console.log(`Failed to get service status: ${err}`);
            return;
          }
          stdout = `${stdout}`;
          if (/=inactive/.test(stdout)) {
            console.log('inactive');
          } else if (/=active/.test(stdout)) {
            console.log('active');
          } else {
            console.log('unknown');
          }
          resolve();
        });
      });
    },
    enable() {
      return this.install()
        .catch(err => Promise.reject(`Failed to enable service: ${err}`))
        .then(() => new Promise((resolve, reject) => {
          const exec = require('child_process').exec;
          exec('systemctl enable xible.service', (err) => {
            if (err) {
              reject(`Failed to enable service: ${err}`);
              return;
            }
            console.log('Service enabled. Xible will now automatically start at boot.');
            resolve();
          });
        }));
    },
    disable() {
      return new Promise((resolve, reject) => {
        const exec = require('child_process').exec;
        exec('systemctl disable xible.service', (err) => {
          if (err) {
            reject(`Failed to disable service: ${err}`);
            return;
          }
          console.log('Service disabled.');
          resolve();
        });
      });
    }
  },
  server: {
    start() {
      // setup a XIBLE instance
      const xible = new Xible({
        configPath: CONFIG_PATH
      });

      // init
      return xible.init();
    }
  },
  start() {
    return this.server.start();
  }

};

function printUsage(path) {
  if (context !== 'help') {
    logError(`Unrecognized context: "${context}"\n`);
  }

  console.log(`Usage: xible ${cli[context] ? context : '<context>'} <command>\n\nWhere ${cli[context] ? '<command>' : '<context>'} is one of:\n\t${Object.keys(path).join(', ')}\n`);

  if (cli[context]) {
    console.log('Type: xible <context> help for more help about the specified context.');
  }
}

if (cli[context]) {
  if (!command && typeof cli[context] === 'function') {
    cli[context]()
      .catch(err => logError(err));
  } else if (command && typeof cli[context][command] === 'function') {
    cli[context][command]()
      .catch(err => logError(err));
  } else {
    printUsage(cli[context]);
  }
}

if (!cli[context]) {
  printUsage(cli);
}
