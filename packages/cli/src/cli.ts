import { runCreateSuperuser } from './commands/create-superuser.js';
import { runMigrate } from './commands/migrate.js';
import { parseFlags } from './utilities/args.js';
import { loadEnv } from './utilities/env.js';

//Prints a short list of what the cli can do.
const printHelp = (): void => {
  console.log(
    [
      'Veneer command line',
      '',
      'Usage:',
      '  veneer migrate [--config path]',
      '  veneer create-superuser --email you@example.com --password secret [--role superuser|editor] [--config path]',
      '',
      'The config path is optional. When left out, Veneer looks for a veneer.config file',
      'in the current folder.',
    ].join('\n'),
  );
};

//Reads the command name, then runs the matching command.
//Returns the process exit code so the caller can pass it to process.exit.
export const runCli = async (argv: string[]): Promise<number> => {
  //Load the dotenv files first so the database settings are available.
  loadEnv();

  const [command, ...rest] = argv;
  const flags = parseFlags(rest);

  switch (command) {
    case 'migrate':
      return runMigrate(flags);

    case 'create-superuser':
      return runCreateSuperuser(flags);

    case undefined:
    case 'help':
    case '--help':
      printHelp();

      return 0;

    default:
      console.error(`Unknown command "${command}".`);
      printHelp();

      return 1;
  }
};
