#!/usr/bin/env node
import { runCli } from './cli.js';

//Entry point for the "veneer" command.
//It runs the cli and turns the result into a process exit code.
runCli(process.argv.slice(2))
  .then((code) => {
    process.exit(code);
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
