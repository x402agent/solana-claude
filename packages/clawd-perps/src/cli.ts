#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { buildPerpsCommand } from "./commands/perps-commands.js";

const program = new Command()
  .name("clawd-perps")
  .description("ClaWD Perps — Phoenix Perpetuals DEX CLI powered by the OpenClawd framework")
  .version("1.1.0");

program.addCommand(buildPerpsCommand());

program.parseAsync(process.argv).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
