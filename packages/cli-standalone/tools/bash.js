import { exec } from 'child_process';
import { promisify } from 'util';
import { ConfirmationService } from '../utils/confirmation-service.js';
const execAsync = promisify(exec);
export class BashTool {
    currentDirectory = process.cwd();
    confirmationService = ConfirmationService.getInstance();
    async execute(command, timeout = 30000) {
        try {
            // Check if user has already accepted bash commands for this session
            const sessionFlags = this.confirmationService.getSessionFlags();
            if (!sessionFlags.bashCommands && !sessionFlags.allOperations) {
                // Request confirmation showing the command
                const confirmationResult = await this.confirmationService.requestConfirmation({
                    operation: 'Run bash command',
                    filename: command,
                    showVSCodeOpen: false,
                    content: `Command: ${command}\nWorking directory: ${this.currentDirectory}`
                }, 'bash');
                if (!confirmationResult.confirmed) {
                    return {
                        success: false,
                        error: confirmationResult.feedback || 'Command execution cancelled by user'
                    };
                }
            }
            if (command.startsWith('cd ')) {
                const newDir = command.substring(3).trim();
                try {
                    process.chdir(newDir);
                    this.currentDirectory = process.cwd();
                    return {
                        success: true,
                        output: `Changed directory to: ${this.currentDirectory}`
                    };
                }
                catch (error) {
                    return {
                        success: false,
                        error: `Cannot change directory: ${error.message}`
                    };
                }
            }
            const { stdout, stderr } = await execAsync(command, {
                cwd: this.currentDirectory,
                timeout,
                maxBuffer: 1024 * 1024
            });
            const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : '');
            return {
                success: true,
                output: output.trim() || 'Command executed successfully (no output)'
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Command failed: ${error.message}`
            };
        }
    }
    getCurrentDirectory() {
        return this.currentDirectory;
    }
    async listFiles(directory = '.') {
        return this.execute(`ls -la ${directory}`);
    }
    async findFiles(pattern, directory = '.') {
        return this.execute(`find ${directory} -name "${pattern}" -type f`);
    }
    async grep(pattern, files = '.') {
        return this.execute(`grep -r "${pattern}" ${files}`);
    }
}
//# sourceMappingURL=bash.js.map