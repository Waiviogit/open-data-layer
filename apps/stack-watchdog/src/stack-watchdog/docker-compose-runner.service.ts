import { spawn } from 'node:child_process';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DockerComposeRunnerService {
  private readonly logger = new Logger(DockerComposeRunnerService.name);

  async runCompose(args: string[]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn('docker', ['compose', ...args], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      });

      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', (err) => {
        reject(err);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        const tailOut = stdout.trimEnd().slice(-2000);
        const tailErr = stderr.trimEnd().slice(-2000);
        reject(
          new Error(
            `docker compose exited with code ${code}. stderr (tail): ${tailErr || '(empty)'} stdout (tail): ${tailOut || '(empty)'}`,
          ),
        );
      });
    });
  }

  logComposeInvocation(args: string[]): void {
    const safe = args.map((a) => (a.includes('\n') ? '[redacted]' : a));
    this.logger.log(`docker compose ${safe.join(' ')}`);
  }
}
