#!/usr/bin/env node

import { Command } from 'commander';
import { MCPClient } from './mcp-client';
import { TUI } from './ui/tui';
import { TransportConfig } from './types';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('mcp-pentester-cli')
  .description('Interactive console tool for pentesting MCP servers via JSON-RPC 2.0')
  .version('1.0.0');

program
  .command('connect')
  .description('Connect to an MCP server')
  .option('-t, --transport <type>', 'Transport type: stdio, http, https, ws, wss', 'stdio')
  .option('-u, --url <url>', 'URL for HTTP/WebSocket transports')
  .option('-c, --command <command>', 'Command for stdio transport')
  .option('-a, --args <args...>', 'Arguments for stdio command')
  .option('--proxy-host <host>', 'Proxy server host')
  .option('--proxy-port <port>', 'Proxy server port')
  .option('--proxy-protocol <protocol>', 'Proxy protocol: http, https, socks, socks5')
  .option('--proxy-user <username>', 'Proxy username')
  .option('--proxy-pass <password>', 'Proxy password')
  .option('-f, --config <file>', 'Load configuration from JSON file')
  .action(async (options) => {
    let config: TransportConfig;

    // Load from config file if provided
    if (options.config) {
      try {
        const configPath = path.resolve(options.config);
        const configData = fs.readFileSync(configPath, 'utf-8');
        config = JSON.parse(configData);
      } catch (error) {
        console.error(`Failed to load config file: ${error}`);
        process.exit(1);
      }
    } else {
      // Build config from command line options
      config = {
        type: options.transport,
      };

      if (options.url) {
        config.url = options.url;
      }

      if (options.command) {
        config.command = options.command;
        config.args = options.args || [];
      }

      if (options.proxyHost && options.proxyPort) {
        config.proxy = {
          host: options.proxyHost,
          port: parseInt(options.proxyPort, 10),
          protocol: options.proxyProtocol,
        };

        if (options.proxyUser && options.proxyPass) {
          config.proxy.auth = {
            username: options.proxyUser,
            password: options.proxyPass,
          };
        }
      }
    }

    // Validate config
    if (config.type === 'stdio' && !config.command) {
      console.error('Error: --command is required for stdio transport');
      process.exit(1);
    }

    if ((config.type === 'http' || config.type === 'https' ||
         config.type === 'ws' || config.type === 'wss') && !config.url) {
      console.error(`Error: --url is required for ${config.type} transport`);
      process.exit(1);
    }

    // Create TUI
    const tui = new TUI();

    // Create and connect client
    const client = new MCPClient(config);
    tui.setClient(client);

    try {
      // Add a timeout to prevent hanging forever
      const connectPromise = client.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      tui.render();
    } catch (error) {
      // Make sure to destroy the screen before exiting
      if (tui && (tui as any).screen) {
        (tui as any).screen.destroy();
      }
      console.error(`\nFailed to connect: ${error}`);
      process.exit(1);
    }
  });

program
  .command('gen-config')
  .description('Generate example configuration files')
  .option('-o, --output <file>', 'Output file path', 'mcp-config.json')
  .action((options) => {
    const exampleConfigs = {
      stdio: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
        env: {},
      },
      http: {
        type: 'http',
        url: 'http://localhost:3000/mcp',
        proxy: {
          host: '127.0.0.1',
          port: 8080,
          protocol: 'http',
        },
      },
      https: {
        type: 'https',
        url: 'https://api.example.com/mcp',
        proxy: {
          host: '127.0.0.1',
          port: 8080,
          protocol: 'http',
          auth: {
            username: 'user',
            password: 'pass',
          },
        },
      },
      websocket: {
        type: 'wss',
        url: 'wss://api.example.com/mcp',
        proxy: {
          host: '127.0.0.1',
          port: 9050,
          protocol: 'socks5',
        },
      },
    };

    const outputPath = path.resolve(options.output);
    fs.writeFileSync(
      outputPath,
      JSON.stringify(exampleConfigs, null, 2),
      'utf-8'
    );

    console.log(`Example configurations written to: ${outputPath}`);
    console.log('\nExample usage:');
    console.log(`  mcp-pentester-cli connect --config ${outputPath} --transport stdio`);
    console.log('  (Edit the file to select a specific config by extracting one transport)');
  });

program.parse();
