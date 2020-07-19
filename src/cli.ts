#!/usr/bin/env node
import { IWatchOptions, IWatchEvent, watchAll } from '.';

import * as process from 'process';
import * as childProcess from 'child_process';
import { platform } from 'os';


let usage = (
`argus path1.1 [...path1.n] -r cmd1 ... pathN.1 [...pathN.n] -r cmdN
    pathX.Y: path to watch
    cmdX: cmd to run if any of pathX.Y has a change observed
`
);

let argv = process.argv.slice(2);

function stripQuotes(x: string) {
  let first = x.substr(0, 1), 
      last = x.substr(-1, 1);
  if (first === last && first === '"' || first === "'") {
    return x.substring(1, x.length-1);
  }
  return x;
}

if (platform() === 'win32') {
  argv = argv.map(stripQuotes);
}

let dryrun = false;

function cmdCB(cmd: string[], events: IWatchEvent[]) {
  let args = cmd.map(x => ((-1 != x.indexOf(' ')) ? `"${x}"` : x));
  try {
    childProcess.execSync(
      args.join(' '), 
      { 
        stdio: [ process.stdin, process.stdout, process.stderr ],
        timeout: 60000, 
        killSignal: 'SIGKILL' 
      }
    );
  } catch (ex) {
    // ignore exception?
    console.error(''+ex);
  }
}

function logCB(cmd: string[], events: IWatchEvent[]) {
  let args = cmd.map(x => ((-1 != x.indexOf(' ')) ? `"${x}"` : x));
  console.log(`not running: ${args.join(' ')}`);
}

let options: IWatchOptions = {
  debounceMS: 1500,
  basecmd: [ 'npm', 'run' ],
  paths: {},
  statusCB(s: string) {
    console.log(s);
  },
  cmdCB
}

let isOption: false | string = false;
let paths = [];
let printUsage = false;

for (let a of argv) {
  //console.log(a);
  if (0 == a.indexOf('-')) {
    switch (a) {
      case '-n':
      case '--dryrun':
      case '--dry-run':
        dryrun = true;
        options.cmdCB = logCB;
        isOption = false;
        break;
      case '--help':
      case '-?':
        printUsage = true;
        break;
      default:
        isOption = a;
        break;
    }
  } else {
    switch (isOption) {
      case '-n':
      case '--dryrun':
      case '--dry-run':
        options.basecmd.unshift('echo');
        break;
      case '-t':
      case '--throttle':
        options.throttleMS = parseInt(a);
        break;
      case '-d':
      case '--debounce':
        options.debounceMS = parseInt(a);
        break;
      case '-b':
      case '--basecmd':
        if (null == options.basecmd) {
          options.basecmd = [ a ];
        } else {
          options.basecmd.push(a);
        }
        break;
      case '-r':
      case '--run':
        options.paths[a] = paths;
        paths = [];
        break;
      case false:
        paths.push(a);
        break;
    }
    isOption = false;
  }
}
if (0 != paths.length) {
  options.paths['rest'] = paths;
}

if (printUsage) {
  console.log(usage);
} else {
  console.log('watching', [].concat(...Object.keys(options.paths).map(p => options.paths[p])));
  //console.log(JSON.stringify(options, null, 2));
  
  let watcher = watchAll(options);
  
  //watcher.show();
}

