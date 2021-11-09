
import * as chokidar from 'chokidar';
import { debounce, throttle } from 'lodash';

export type Paths = string | string[];

export interface IWatchEvent {
  file: string;
  kind: 'add' | 'addDir' | 'unlink' | 'removeDir' | 'change' | string;
}

export interface IWatchOptions {
  basecmd: string[];
  paths: {
    [cmdtail: string]: Paths;
  }

  statusCB?: (s: string) => void;
  cmdCB?: (cmd: string[], events: IWatchEvent[]) => void;

  throttleMS?: number;
  debounceMS?: number;
}

export interface ICompoundWatcher {
  stop(): void;
  on(what: 'status', statusCB: (s: string)=>void);
}

function runCmd(cmd: string[], events: IWatchEvent[]) {
  console.log(cmd, events);
}

function logger(prefix: string) {
  return console.log.bind(console, prefix+' ');
}
let log = logger('log');

export class CompoundWatcher implements ICompoundWatcher {
  constructor(options: IWatchOptions) {
    this._statusCB = [];
    if (options.statusCB) {
      this._statusCB.push(options.statusCB);
    }
    
    let cmds = Object.keys(options.paths)
    this._paths = cmds.map(c => options.paths[c]);

    let runner = (csuffix) => {
      let cmd = [ ...options.basecmd, csuffix];
      let args = [];
      let cmdFun = () => {
        (options.cmdCB || runCmd)(cmd, args);
        args = [];
      }
      if (options.throttleMS) {
        cmdFun = throttle(cmdFun, options.throttleMS, { trailing: true, leading: false });
      }
      if (options.debounceMS) {
        cmdFun = debounce(cmdFun, options.debounceMS, { trailing: true, leading: false });
      }
      return (event, file) => {
        args.push({file, event});
        cmdFun();
      };
    }

    let watchOpts = { cwd: process.cwd(), ignoreInitial: false };
    let watchers = this._watchers = [];
     
    for (var i = 0, n = cmds.length; i < n; ++i) {
      let c = cmds[i];
      let watched = options.paths[c];
      if (!Array.isArray(watched)) {
        watched = [ watched ];
      }
      let ignored = watched.filter(x => x.substring(0, 1) === '!').map(x => x.substring(1));
      watched = watched.filter(x => x.substring(0, 1) !== '!');
      watchers[i] = chokidar.watch(watched, { ...watchOpts, ignored })
      let listener = runner(c);
      watchers[i].addListener('all', listener);
      //this._watchers[i].addListener('raw', logger('raw'));
    }
    watchers.forEach((w,i) => w.on('ready', () => console.log(`watcher (${this.paths(i)}): ready`)));
    watchers.forEach(w => w.on('error', (e) => console.log(`w: ${e}`)));
  }


  on(kind: 'status', statusCB: (s: string) =>  void) {
    this._statusCB.push(statusCB);
  }
   
   stop() {
    let paths = this._paths;
    this._watchers.forEach((x, i) => {
      x.unwatch(paths[i]);
      x.removeAllListeners('all');
    });
  }

  show() {
    console.log(this._watchers.map(w => w.getWatched()));
  }

  private paths(i: number) {
    let p = this._paths[i];
    if (Array.isArray(p)) {
      p = p.join(';');
    }
    return p;
  }
  private statusCB(s: string) {
    this._statusCB.forEach(scb => scb(s));
  }

  private _watchers: chokidar.FSWatcher[];
  private _paths: Paths[];
  private _statusCB: ((s: string) => void)[] = [ () => {} ];
}

export function watchAll(options: IWatchOptions) {
  let result = new CompoundWatcher(options);

  return result;
}
