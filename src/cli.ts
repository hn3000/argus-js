#!/usr/bin/env node
import { IWatchOptions, IWatchEvent, watchAll } from '.';

import * as process from 'process';
import * as childProcess from 'child_process';
import { platform } from 'os';


const usage = (
`argus [...options] path1.1 [...path1.n] -r <cmd1> [... pathN.1 [...pathN.n] -r <cmdN>]
      pathX.Y: path pattern to watch, e.g. src/*.js, data/**/*.json
               patterns must be understood by chokidar
      cmdX: cmd to run if any of pathX.Y has a change observed
            every set of path patterns must be followed by -r <cmd> or --run <cmd>
    options:
      -n, --dryrun, --dry-run: 
        only show commands that would run, don't actually run them

      -d <ms>, --debounce <ms>:
        wait <ms> after detecting a change, default is 1500, give 0 to disable

      -t <ms>, --throttle <ms>:
        do not run more often than every <ms>

      -b, --basecmd:
        specify a prefix for cmd given in -r, default is equivalent to
        -b npm -b run

      -r <cmd>, --run <cmd>:
        give a command to run when a change is detected in the files
        matching the path patterns given before this option
        starts a new set of patterns to watch

      -?, --help:
        print this help message
`
);

// shown if patterns without -r / --run are found
const restWarning = (
`
  make sure to follow every set of paths / patterns with -r or --run
`
);

let argv = process.argv.slice(2);

function stripQuotes(x: string) {
  let first = x.substring(0, 1), 
      last = x.substring(x.length - 1, 1);
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
  if (a.startsWith('-')) {
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

if (printUsage || argv.length === 0 || options.paths['rest']) {
  console.log(usage);
  if(options.paths['rest']) {
    console.log(restWarning)
  }
} else {
  if (dryrun) {
    options.basecmd.unshift('echo');
  }
  
  console.log('watching', [].concat(...Object.keys(options.paths).map(p => options.paths[p])));
  //console.log(JSON.stringify(options, null, 2));
  
  let watcher = watchAll(options);
  
  //watcher.show();
}

