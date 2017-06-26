
# Argus: project watcher runs `npm run` scripts

Conveniently watch several directories / patterns at the same time and trigger the appropriate `npm run` scripts.

Could probably be done simply using 'watch', but I'm too lazy to write a watch-filter function. While chokidar-cli can be used to run a single command when a change is matched, this tool can watch several patterns at the same time and run different tools for each set of patterns.

Different tools will not be run in parallel, so that it is easier to interpret the output of the tools.

## Examples

The command 

    $ argus src -r tsc **/*.sass -r sass

will run `npm run tsc` for any changes to files in `src` and `npm run sass` for changes
in sass files (having names that end in `.sass`).

Multiple patterns can be given for the same run script:

    $ argus src/**/*.ts src/**/*.tsx -r tsc


You can also ignore stuff:

    $ argus src !**/*.js -r tsc

will ignore changes to js files.

## Commandline syntax

    $ argus <global options> [<patterns...> -r <cmd> ]+

### Patterns

Patterns supported are the extended wildcards understood by [chokidar](https://github.com/paulmillr/chokidar). Patterns starting with an exclamation point "!" are used as ignored patterns.

### Command to run

 * `-r <cmdsuffix>`, `--run <cmdsuffix>`: command to run if one of the preceeding patterns matches a changed file, gets appended to the basecmd (`npm run` by default).


### Global options
 * `n`, `--dry-run`: don't run `npm run`, just echo command instead of running it
 * `t <ms>`, `-throttle <ms>`: throttle change events to less than one per number of milliseconds given (Default is no throttle.)
 * `-d <ms>`, `--debounce <ms>`: debounce change events to occur only after the given number of milliseconds has passed without further changes. (Default debounce time is 1500 milliseconds. Specify 0 to disable.)
 * `-b <basecmd>`, `--basecmd <basecmd>`: base command, default is 'npm run', will be prepended to whatever is given as -r
