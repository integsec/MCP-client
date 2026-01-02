import { spawn, ChildProcess } from 'child_process';
import { Transport } from './base';
import { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from '../types';

export class StdioTransport extends Transport {
  private process?: ChildProcess;
  private buffer = '';

  constructor(
    private command: string,
    private args: string[] = [],
    private env: Record<string, string> = {}
  ) {
    super();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn(this.command, this.args, {
        env: { ...process.env, ...this.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.process.stdout?.on('data', (data: Buffer) => {
        this.handleData(data.toString());
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        this.emit('stderr', data.toString());
      });

      this.process.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });

      this.process.on('exit', (code) => {
        this.emit('exit', code);
      });

      // Give the process a moment to start
      setTimeout(() => resolve(), 100);
    });
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = undefined;
    }
  }

  async send(data: JsonRpcRequest | JsonRpcNotification): Promise<void> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Transport not connected');
    }

    const message = JSON.stringify(data) + '\n';
    this.emit('send', data);

    return new Promise((resolve, reject) => {
      this.process!.stdin!.write(message, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private handleData(data: string): void {
    this.buffer += data;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.emit('receive', message);

          if ('result' in message || 'error' in message) {
            this.handleResponse(message as JsonRpcResponse);
          } else if ('method' in message && !('id' in message)) {
            this.handleNotification(message as JsonRpcNotification);
          } else if ('method' in message && 'id' in message) {
            // This is a request from the server
            this.emit('request', message);
          }
        } catch (error) {
          this.emit('error', new Error(`Failed to parse JSON: ${line}`));
        }
      }
    }
  }
}
