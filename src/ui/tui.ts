import blessed from "blessed";
import { MCPClient } from "../mcp-client";
import { MCPTool, MCPResource, MCPPrompt, TransportConfig } from "../types";
import * as fs from "fs";
import * as path from "path";

export class TUI {
  private screen: blessed.Widgets.Screen;
  private layout: {
    sidebar: blessed.Widgets.ListElement;
    main: blessed.Widgets.ListElement;
    status: blessed.Widgets.BoxElement;
    traffic: blessed.Widgets.BoxElement;
    input: blessed.Widgets.TextboxElement;
  };

  private currentView: "tools" | "resources" | "prompts" | "traffic" = "tools";
  private client?: MCPClient;
  private currentConfig?: TransportConfig;
  private trafficLines: string[] = [];
  private trafficPairs: Array<{
    request: any;
    response: any | null;
    timestamp: Date;
  }> = [];
  private activePanel: "sidebar" | "main" | "traffic" = "sidebar";
  private pendingRequests = new Map<number | string, any>(); // Track requests waiting for responses
  private currentPopupContent: {
    raw: string;
    rendered: string;
    title: string;
    color: string;
  } | null = null;
  private showRawInPopup = false;

  // Enhanced traffic log features
  private trafficFilter: {
    method: string | null;
    transport: string | null;
    status: "all" | "success" | "error" | "pending";
    searchText: string;
    useRegex: boolean;
  } = {
    method: null,
    transport: null,
    status: "all",
    searchText: "",
    useRegex: false,
  };
  private trafficStats = {
    totalRequests: 0,
    successCount: 0,
    errorCount: 0,
    pendingCount: 0,
    avgResponseTime: 0,
    methodCounts: new Map<string, number>(),
  };

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: "MCP Pentester CLI - IntegSec",
    });

    this.layout = this.createLayout();
    this.setupKeyBindings();
  }

  private showSplashScreen() {
    const splash = blessed.box({
      parent: this.screen,
      top: "center",
      left: "center",
      width: 70,
      height: 18,
      border: { type: "line" },
      style: {
        border: { fg: "cyan", bold: true },
      },
      content: `{center}{cyan-fg}{bold}
 ██▓ ███▄    █ ▄▄▄█████▓▓█████   ▄████   ██████ ▓█████  ▄████▄
▓██▒ ██ ▀█   █ ▓  ██▒ ▓▒▓█   ▀  ██▒ ▀█▒▒██    ▒ ▓█   ▀ ▒██▀ ▀█
▒██▒▓██  ▀█ ██▒▒ ▓██░ ▒░▒███   ▒██░▄▄▄░░ ▓██▄   ▒███   ▒▓█    ▄
░██░▓██▒  ▐▌██▒░ ▓██▓ ░ ▒▓█  ▄ ░▓█  ██▓  ▒   ██▒▒▓█  ▄ ▒▓▓▄ ▄██▒
░██░▒██░   ▓██░  ▒██▒ ░ ░▒████▒░▒▓███▀▒▒██████▒▒░▒████▒▒ ▓███▀ ░
░▓  ░ ▒░   ▒ ▒   ▒ ░░   ░░ ▒░ ░ ░▒   ▒ ▒ ▒▓▒ ▒ ░░░ ▒░ ░░ ░▒ ▒  ░
 ▒ ░░ ░░   ░ ▒░    ░     ░ ░  ░  ░   ░ ░ ░▒  ░ ░ ░ ░  ░  ░  ▒
 ▒ ░   ░   ░ ░   ░         ░   ░ ░   ░ ░  ░  ░     ░   ░
 ░           ░             ░  ░      ░       ░     ░  ░░ ░
{/bold}{/cyan-fg}
{bold}{yellow-fg}MCP Pentester CLI v1.0.0{/yellow-fg}{/bold}
{green-fg}{bold}integsec.com{/bold}{/green-fg} {gray-fg}|{/gray-fg} {white-fg}Security Testing{/white-fg}
{gray-fg}© 2025 IntegSec - All Rights Reserved{/gray-fg}
{green-fg}Press any key (auto-closes in 2s)...{/green-fg}{/center}`,
      tags: true,
    });

    this.screen.render();

    const closeHandler = () => {
      if (!splash.detached) {
        splash.destroy();
        this.screen.render();
      }
    };

    // Auto-close after 2 seconds
    setTimeout(closeHandler, 2000);

    // Or close on any keypress
    this.screen.once("keypress", closeHandler);
  }

  private createLayout() {
    // IntegSec Logo (top right)
    const logo = blessed.box({
      parent: this.screen,
      top: 0,
      right: 0,
      width: 20,
      height: 5,
      tags: true,
      content:
        "{right}{cyan-fg}{bold}IntegSec{/bold}\n{gray-fg}Security\nTesting{/gray-fg}{/cyan-fg}{/right}",
      style: {
        fg: "cyan",
      },
    });

    // Sidebar (left panel) - Navigation
    const sidebar = blessed.list({
      parent: this.screen,
      label: " Navigation ",
      tags: true,
      top: 0,
      left: 0,
      width: "20%",
      height: "70%",
      border: { type: "line" },
      style: {
        border: { fg: "cyan" },
        selected: { bg: "blue", fg: "white" },
        item: { fg: "white" },
      },
      keys: true,
      vi: true,
      mouse: true,
      items: [
        "{cyan-fg}Tools{/cyan-fg}",
        "{cyan-fg}Resources{/cyan-fg}",
        "{cyan-fg}Prompts{/cyan-fg}",
        "{cyan-fg}Traffic Log{/cyan-fg}",
      ],
    });

    // Main panel (center) - Content display (using list for interactivity)
    const main = blessed.list({
      parent: this.screen,
      label: " Content ",
      tags: true,
      top: 0,
      left: "20%",
      width: "80%",
      height: "70%",
      border: { type: "line" },
      style: {
        border: { fg: "cyan" },
        selected: { bg: "blue", fg: "white" },
        item: { fg: "white" },
      },
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: " ",
        style: { bg: "cyan" },
      },
      interactive: true,
    }) as any;

    // Status bar
    const status = blessed.box({
      parent: this.screen,
      top: "70%",
      left: 0,
      width: "100%",
      height: 3,
      tags: true,
      border: { type: "line" },
      style: {
        border: { fg: "yellow" },
      },
      content: "{yellow-fg}Status:{/yellow-fg} Disconnected",
    });

    // Traffic log (bottom panel)
    const traffic = blessed.box({
      parent: this.screen,
      label: " Traffic Log ",
      tags: true,
      top: "73%",
      left: 0,
      width: "100%",
      height: "24%",
      border: { type: "line" },
      style: {
        border: { fg: "green" },
      },
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: " ",
        style: { bg: "green" },
      },
      content: "",
    });

    // Input box (hidden by default)
    const input = blessed.textbox({
      parent: this.screen,
      label: " Input ",
      top: "center",
      left: "center",
      width: "60%",
      height: 3,
      border: { type: "line" },
      style: {
        border: { fg: "magenta" },
        focus: { border: { fg: "blue" } },
      },
      hidden: true,
      inputOnFocus: true,
      keys: true,
      mouse: true,
    });

    return { sidebar, main, status, traffic, input };
  }

  private setupKeyBindings() {
    // F10 - Quit application
    this.screen.key(["f10", "C-c"], () => {
      return process.exit(0);
    });

    // Navigate sidebar
    this.layout.sidebar.on("select", (item, index) => {
      switch (index) {
        case 0:
          this.showTools();
          break;
        case 1:
          this.showResources();
          break;
        case 2:
          this.showPrompts();
          break;
        case 3:
          this.showTrafficLog();
          break;
      }
      // Auto-focus the content pane after selecting from sidebar
      this.activePanel = "main";
      this.updatePanelHighlight();
      this.layout.main.focus();
      this.screen.render();
    });

    // F5 - Refresh current view
    this.screen.key(["f5"], async () => {
      if (this.client) {
        await this.client.refreshAll();
        this.updateCurrentView();
      }
    });

    // F1 - Focus sidebar
    this.screen.key(["f1"], () => {
      this.activePanel = "sidebar";
      this.updatePanelHighlight();
      this.layout.sidebar.focus();
      this.screen.render();
    });

    // F2 - Focus main panel
    this.screen.key(["f2"], () => {
      this.activePanel = "main";
      this.updatePanelHighlight();
      this.layout.main.focus();
      this.screen.render();
    });

    // F3 - Focus traffic panel
    this.screen.key(["f3"], () => {
      this.activePanel = "traffic";
      this.updatePanelHighlight();
      this.layout.traffic.focus();
      this.screen.render();
    });

    // F6 - Show saved connections
    this.screen.key(["f6"], () => {
      this.showSavedConnections();
    });

    // F7 - Show filter dialog
    this.screen.key(["f7"], () => {
      if (this.currentView === "traffic") {
        this.showFilterDialog();
      }
    });

    // F8 - Show search dialog
    this.screen.key(["f8"], () => {
      if (this.currentView === "traffic") {
        this.showSearchDialog();
      }
    });

    // F9 - Export traffic
    this.screen.key(["f9"], () => {
      if (this.currentView === "traffic" && this.client) {
        this.showExportDialog();
      }
    });

    // F11 - Show detailed statistics
    this.screen.key(["f11"], () => {
      if (this.currentView === "traffic") {
        this.showStatsDialog();
      }
    });

    // R - Replay request (when in traffic view)
    this.screen.key(["r"], () => {
      if (this.currentView === "traffic" && this.activePanel === "main") {
        this.replaySelectedRequest();
      }
    });

    // Handle selection in main panel
    this.layout.main.key(["enter"], async () => {
      await this.handleMainSelection();
    });

    // Clear traffic log with 'c' when focused
    this.layout.traffic.key(["c"], () => {
      if (this.client) {
        this.client.clearTrafficLog();
        this.trafficLines = [];
        this.trafficPairs = [];
        this.layout.traffic.setContent("");
        // Reset statistics
        this.trafficStats.totalRequests = 0;
        this.trafficStats.successCount = 0;
        this.trafficStats.errorCount = 0;
        this.trafficStats.pendingCount = 0;
        this.trafficStats.avgResponseTime = 0;
        this.trafficStats.methodCounts.clear();
        this.updateCurrentView();
        this.screen.render();
      }
    });
  }

  setClient(client: MCPClient, config?: TransportConfig) {
    // Remove all listeners from old client if it exists
    if (this.client) {
      this.client.removeAllListeners();
    }

    this.client = client;
    if (config) {
      this.currentConfig = config;
    }

    // Set up event handlers
    client.on("connected", (result) => {
      const serverName = result.serverInfo?.name || "Unknown";
      const serverVersion = result.serverInfo?.version || "?";

      // Save connection config on successful connection
      if (this.currentConfig) {
        this.saveConnectionConfig(this.currentConfig, serverName);
      }

      this.layout.status.setContent(
        `{green-fg}Connected{/green-fg} to ${this.escapeBlessedTags(serverName)} v${serverVersion} | ` +
          `{cyan-fg}F1{/cyan-fg}=Nav {cyan-fg}F2{/cyan-fg}=Content {cyan-fg}F3{/cyan-fg}=Traffic {cyan-fg}F4{/cyan-fg}=Close {cyan-fg}F5{/cyan-fg}=Refresh {cyan-fg}F6{/cyan-fg}=Connections {cyan-fg}F10{/cyan-fg}=Quit | ` +
          `{bold}{cyan-fg}IntegSec{/cyan-fg}{/bold} {gray-fg}({green-fg}integsec.com{/green-fg}) - Need pentesting? Contact us!{/gray-fg}`,
      );
      this.updateCurrentView();
      this.screen.render();
    });

    client.on("disconnected", () => {
      this.layout.status.setContent("{red-fg}Status:{/red-fg} Disconnected");
      this.screen.render();
    });

    client.on("error", (error) => {
      this.addTrafficLine(`{red-fg}ERROR:{/red-fg} ${error.message}`);
      this.screen.render();
    });

    client.on("traffic", ({ direction, data }) => {
      const timestamp = new Date().toISOString().substr(11, 12);

      if (direction === "sent" && "method" in data) {
        // This is a request
        const method = data.method;
        let details = "";

        // Update statistics
        this.trafficStats.totalRequests++;
        const methodCount = this.trafficStats.methodCounts.get(method) || 0;
        this.trafficStats.methodCounts.set(method, methodCount + 1);

        if (data.method === "tools/call" && data.params) {
          details = ` tool=${data.params.name}`;
          if (data.params.arguments) {
            const argKeys = Object.keys(data.params.arguments);
            if (argKeys.length > 0) {
              details += ` args=${argKeys.join(",")}`;
            }
          }
        } else if (data.method === "resources/read" && data.params) {
          details = ` uri=${data.params.uri}`;
        } else if (data.method === "prompts/get" && data.params) {
          details = ` prompt=${data.params.name}`;
        }

        const requestLine = `{cyan-fg}[${timestamp}]{/cyan-fg} {yellow-fg}>>>{/yellow-fg} ${this.escapeBlessedTags(method + details)}`;

        if ("id" in data && data.id !== undefined) {
          // Store request, waiting for response - store full data for detail view
          this.trafficStats.pendingCount++;
          this.pendingRequests.set((data as any).id, {
            line: requestLine,
            data,
            timestamp: new Date(),
          });
        } else {
          // Notification (no response expected)
          this.addTrafficLine(requestLine);
        }
      } else if (direction === "received") {
        // This is a response
        const responseId = "id" in data ? (data as any).id : null;

        let responseLine = "";
        if ("error" in data && data.error) {
          const errorMsg = this.escapeBlessedTags(
            String(data.error.message || "Unknown error"),
          );

          // Suppress "method not found" errors for list methods (expected when server doesn't support them)
          if (responseId !== null && this.pendingRequests.has(responseId)) {
            const requestData = this.pendingRequests.get(responseId)!.data;
            if (requestData && "method" in requestData) {
              const method = (requestData as any).method;
              const isListMethod = [
                "tools/list",
                "resources/list",
                "prompts/list",
              ].includes(method);
              const isMethodNotFoundError =
                errorMsg.includes("not a function") ||
                errorMsg.includes("not found") ||
                (data.error as any)?.code === -32601;

              if (isListMethod && isMethodNotFoundError) {
                // Don't log expected "method not supported" errors for list methods
                this.pendingRequests.delete(responseId);
                this.trafficStats.pendingCount--;
                return; // Skip logging this error
              }
            }
          }

          // Update error statistics
          this.trafficStats.errorCount++;
          if (responseId !== null && this.pendingRequests.has(responseId)) {
            this.trafficStats.pendingCount--;
          }

          responseLine = `{cyan-fg}[${timestamp}]{/cyan-fg} {red-fg}<<<{/red-fg} ERROR: ${errorMsg}`;
        } else {
          // Update success statistics
          this.trafficStats.successCount++;
          if (responseId !== null && this.pendingRequests.has(responseId)) {
            this.trafficStats.pendingCount--;

            // Calculate response time
            const reqData = this.pendingRequests.get(responseId);
            if (reqData && reqData.timestamp) {
              const responseTime = Date.now() - reqData.timestamp.getTime();
              const totalTime =
                this.trafficStats.avgResponseTime *
                (this.trafficStats.successCount - 1);
              this.trafficStats.avgResponseTime =
                (totalTime + responseTime) / this.trafficStats.successCount;
            }
          }

          const resultPreview =
            "result" in data && data.result
              ? this.formatResultPreview(data.result)
              : "OK";
          responseLine = `{cyan-fg}[${timestamp}]{/cyan-fg} {green-fg}<<<{/green-fg} ${resultPreview}`;
        }

        if (responseId !== null && this.pendingRequests.has(responseId)) {
          // Found matching request - show summary in log, store full data for detail view
          const {
            line: requestLine,
            data: requestData,
            timestamp: reqTime,
          } = this.pendingRequests.get(responseId)!;
          this.pendingRequests.delete(responseId);

          // Add summary to traffic log
          this.addTrafficPair(requestLine, responseLine);

          // Store full data for detail view
          this.trafficPairs.unshift({
            request: requestData,
            response: data,
            timestamp: reqTime,
          });
          if (this.trafficPairs.length > 50) {
            this.trafficPairs = this.trafficPairs.slice(0, 50);
          }
        } else {
          // No matching request or notification
          this.addTrafficLine(responseLine);
        }
      }

      this.screen.render();
    });
  }

  private updatePanelHighlight(): void {
    // Reset all borders to normal
    this.layout.sidebar.style.border = { fg: "cyan" };
    this.layout.main.style.border = { fg: "cyan" };
    this.layout.traffic.style.border = { fg: "green" };

    // Highlight active panel with bold yellow border
    switch (this.activePanel) {
      case "sidebar":
        this.layout.sidebar.style.border = { fg: "yellow", bold: true };
        break;
      case "main":
        this.layout.main.style.border = { fg: "yellow", bold: true };
        break;
      case "traffic":
        this.layout.traffic.style.border = { fg: "yellow", bold: true };
        break;
    }
  }

  private showTools() {
    this.currentView = "tools";
    this.updateCurrentView();
  }

  private showResources() {
    this.currentView = "resources";
    this.updateCurrentView();
  }

  private showPrompts() {
    this.currentView = "prompts";
    this.updateCurrentView();
  }

  private showTrafficLog() {
    this.currentView = "traffic";
    this.updateCurrentView();
  }

  private updateCurrentView() {
    if (!this.client) return;

    // Check if client is connected before trying to get state
    const state = this.client.getState();
    if (!state.connected) {
      // Client not connected yet, show loading message
      this.layout.main.setItems([
        "{yellow-fg}Connecting... Please wait.{/yellow-fg}",
      ]);
      return;
    }

    switch (this.currentView) {
      case "tools":
        this.displayTools(state.tools);
        break;
      case "resources":
        this.displayResources(state.resources);
        break;
      case "prompts":
        this.displayPrompts(state.prompts);
        break;
      case "traffic":
        this.displayTraffic();
        break;
    }
  }

  private displayTools(tools: MCPTool[]) {
    this.layout.main.setLabel(
      ` Tools (${tools.length}) - Press Enter to execute `,
    );

    if (tools.length === 0) {
      this.layout.main.setItems([
        "{yellow-fg}No tools available - Press F5 to refresh{/yellow-fg}",
      ]);
    } else {
      const items = tools.map((tool, idx) => {
        let label = `${idx + 1}. {bold}${tool.name}{/bold}`;
        if (tool.description) {
          label += ` - ${tool.description}`;
        }
        return label;
      });
      this.layout.main.setItems(items);
    }

    this.screen.render();
  }

  private displayResources(resources: MCPResource[]) {
    this.layout.main.setLabel(
      ` Resources (${resources.length}) - Press Enter to read `,
    );

    if (resources.length === 0) {
      this.layout.main.setItems([
        "{yellow-fg}No resources available - Press F5 to refresh{/yellow-fg}",
      ]);
    } else {
      const items = resources.map((resource, idx) => {
        let label = `${idx + 1}. {bold}${resource.name}{/bold} - {gray-fg}${resource.uri}{/gray-fg}`;
        if (resource.description) {
          label += ` - ${resource.description}`;
        }
        return label;
      });
      this.layout.main.setItems(items);
    }

    this.screen.render();
  }

  private displayPrompts(prompts: MCPPrompt[]) {
    this.layout.main.setLabel(
      ` Prompts (${prompts.length}) - Press Enter to use `,
    );

    if (prompts.length === 0) {
      this.layout.main.setItems([
        "{yellow-fg}No prompts available - Press F5 to refresh{/yellow-fg}",
      ]);
    } else {
      const items = prompts.map((prompt, idx) => {
        let label = `${idx + 1}. {bold}${prompt.name}{/bold}`;
        if (prompt.description) {
          label += ` - ${prompt.description}`;
        }
        return label;
      });
      this.layout.main.setItems(items);
    }

    this.screen.render();
  }

  private displayTraffic() {
    if (!this.client) return;

    const logs = this.client.getTrafficLog();
    const filtered = this.filterTrafficLogs(logs);

    // Build filter status string
    const filterParts: string[] = [];
    if (this.trafficFilter.method)
      filterParts.push(`method=${this.trafficFilter.method}`);
    if (this.trafficFilter.transport)
      filterParts.push(`transport=${this.trafficFilter.transport}`);
    if (this.trafficFilter.status !== "all")
      filterParts.push(`status=${this.trafficFilter.status}`);
    if (this.trafficFilter.searchText)
      filterParts.push(`search="${this.trafficFilter.searchText}"`);
    const filterStatus =
      filterParts.length > 0 ? ` [FILTERED: ${filterParts.join(", ")}]` : "";

    // Build statistics header
    const successRate =
      this.trafficStats.totalRequests > 0
        ? (
            (this.trafficStats.successCount / this.trafficStats.totalRequests) *
            100
          ).toFixed(1)
        : "0.0";
    const avgTime = this.trafficStats.avgResponseTime.toFixed(0);
    const statsHeader = `Total: ${this.trafficStats.totalRequests} | Success: {green-fg}${this.trafficStats.successCount}{/green-fg} | Error: {red-fg}${this.trafficStats.errorCount}{/red-fg} | Pending: {yellow-fg}${this.trafficStats.pendingCount}{/yellow-fg} | Success Rate: ${successRate}% | Avg Time: ${avgTime}ms`;

    this.layout.main.setLabel(
      ` Traffic History (${filtered.length}/${logs.length})${filterStatus} - Press Enter for details | F7=Filter F8=Search F9=Export F11=Stats `,
    );

    if (filtered.length === 0) {
      this.layout.main.setItems([
        "{yellow-fg}No traffic logged yet{/yellow-fg}",
        "",
        statsHeader,
      ]);
    } else {
      // Build enhanced table view with columns
      const items: string[] = [];

      // Add statistics header
      items.push(`{cyan-fg}${statsHeader}{/cyan-fg}`);
      items.push(""); // Blank line

      // Add table header
      const header = this.formatTrafficTableRow(
        "#",
        "Time",
        "Method",
        "Transport",
        "Status",
        "Size",
        "Duration",
        true,
      );
      items.push(header);
      items.push("{cyan-fg}" + "─".repeat(100) + "{/cyan-fg}");

      const processedIds = new Set<number | string>();

      // Process in reverse order (most recent first)
      for (let i = 0; i < Math.min(filtered.length, 100); i++) {
        const log = filtered[i];

        // Skip if we already processed this request/response pair
        if ("id" in log.data) {
          const logId = (log.data as any).id;
          if (processedIds.has(logId)) continue;
          processedIds.add(logId);
        }

        // Find matching request/response pair IN THE FULL LOGS (not filtered)
        let requestLog = log;
        let responseLog = null;

        if (log.direction === "received" && "id" in log.data) {
          const requestId = (log.data as any).id;
          // Find the request in full logs
          for (let j = 0; j < logs.length; j++) {
            if (
              logs[j].direction === "sent" &&
              "id" in logs[j].data &&
              (logs[j].data as any).id === requestId
            ) {
              requestLog = logs[j];
              responseLog = log;
              break;
            }
          }
        } else if (log.direction === "sent" && "id" in log.data) {
          const requestId = (log.data as any).id;
          // Find the response in full logs
          for (let j = 0; j < logs.length; j++) {
            if (
              logs[j].direction === "received" &&
              "id" in logs[j].data &&
              (logs[j].data as any).id === requestId
            ) {
              responseLog = logs[j];
              break;
            }
          }
        }

        // Calculate row data
        const num = String(i + 1);
        const timestamp = requestLog.timestamp.toISOString().substr(11, 12);
        const method =
          "method" in requestLog.data ? requestLog.data.method : "unknown";
        const transport = requestLog.transport || "unknown";

        let status: string;
        let statusColor: string;
        if (!responseLog) {
          status = "PENDING";
          statusColor = "yellow";
        } else if ("error" in responseLog.data) {
          status = "ERROR";
          statusColor = "red";
        } else {
          status = "OK";
          statusColor = "green";
        }

        // Calculate size (rough estimate based on JSON length)
        const reqSize = JSON.stringify(requestLog.data).length;
        const respSize = responseLog
          ? JSON.stringify(responseLog.data).length
          : 0;
        const totalSize = reqSize + respSize;
        const sizeStr =
          totalSize > 1024
            ? `${(totalSize / 1024).toFixed(1)}KB`
            : `${totalSize}B`;

        // Calculate duration
        let durationStr = "-";
        if (responseLog && "id" in requestLog.data) {
          const duration =
            responseLog.timestamp.getTime() - requestLog.timestamp.getTime();
          durationStr =
            duration > 1000
              ? `${(duration / 1000).toFixed(2)}s`
              : `${duration}ms`;
        }

        const row = this.formatTrafficTableRow(
          num,
          timestamp,
          method,
          transport,
          `{${statusColor}-fg}${status}{/${statusColor}-fg}`,
          sizeStr,
          durationStr,
          false,
        );
        items.push(row);
      }

      this.layout.main.setItems(items);
    }

    this.screen.render();
  }

  private formatTrafficTableRow(
    num: string,
    time: string,
    method: string,
    transport: string,
    status: string,
    size: string,
    duration: string,
    isHeader: boolean,
  ): string {
    // Column widths
    const numW = 4;
    const timeW = 12;
    const methodW = 25;
    const transportW = 10;
    const statusW = 10;
    const sizeW = 8;
    const durationW = 10;

    const pad = (str: string, width: number, color?: string) => {
      // Strip color tags for length calculation
      const stripped = str.replace(/\{[^}]+\}/g, "");
      const padding = " ".repeat(Math.max(0, width - stripped.length));
      return str + padding;
    };

    if (isHeader) {
      return `{bold}{cyan-fg}${pad(num, numW)} ${pad(time, timeW)} ${pad(method, methodW)} ${pad(transport, transportW)} ${pad(status, statusW)} ${pad(size, sizeW)} ${pad(duration, durationW)}{/cyan-fg}{/bold}`;
    } else {
      const escapedMethod = this.escapeBlessedTags(method);
      return `${pad(num, numW)} {gray-fg}${pad(time, timeW)}{/gray-fg} {yellow-fg}${pad(escapedMethod, methodW)}{/yellow-fg} ${pad(transport, transportW)} ${pad(status, statusW)} ${pad(size, sizeW)} ${pad(duration, durationW)}`;
    }
  }

  private filterTrafficLogs(logs: any[]): any[] {
    return logs.filter((log) => {
      // Filter by method
      if (this.trafficFilter.method) {
        const method = "method" in log.data ? log.data.method : "";
        if (!method.includes(this.trafficFilter.method)) return false;
      }

      // Filter by transport
      if (this.trafficFilter.transport) {
        if (log.transport !== this.trafficFilter.transport) return false;
      }

      // Filter by status (need to find matching response)
      if (this.trafficFilter.status !== "all") {
        if (log.direction === "sent" && "id" in log.data) {
          // Find response
          const requestId = (log.data as any).id;
          const responseLog = logs.find(
            (l) =>
              l.direction === "received" &&
              "id" in l.data &&
              (l.data as any).id === requestId,
          );

          if (this.trafficFilter.status === "pending" && responseLog)
            return false;
          if (
            this.trafficFilter.status === "success" &&
            (!responseLog || "error" in responseLog.data)
          )
            return false;
          if (
            this.trafficFilter.status === "error" &&
            (!responseLog || !("error" in responseLog.data))
          )
            return false;
        }
      }

      // Filter by search text
      if (this.trafficFilter.searchText) {
        const searchStr = JSON.stringify(log.data).toLowerCase();
        if (this.trafficFilter.useRegex) {
          try {
            const regex = new RegExp(this.trafficFilter.searchText, "i");
            if (!regex.test(searchStr)) return false;
          } catch (e) {
            // Invalid regex, fall back to simple search
            if (
              !searchStr.includes(this.trafficFilter.searchText.toLowerCase())
            )
              return false;
          }
        } else {
          if (!searchStr.includes(this.trafficFilter.searchText.toLowerCase()))
            return false;
        }
      }

      return true;
    });
  }

  private escapeBlessedTags(text: string): string {
    // Escape curly braces so blessed doesn't try to parse them as tags
    return text.replace(/{/g, "\\{").replace(/}/g, "\\}");
  }

  private formatResultPreview(result: any): string {
    let preview: string;
    if (typeof result === "string") {
      preview = result.length > 50 ? result.substring(0, 47) + "..." : result;
    } else if (Array.isArray(result)) {
      preview = `Array[${result.length}]`;
    } else if (typeof result === "object" && result !== null) {
      const keys = Object.keys(result);
      if (keys.length === 0) return "{}";
      preview = `{${keys.slice(0, 3).join(",")}}`;
    } else {
      preview = String(result);
    }
    return this.escapeBlessedTags(preview);
  }

  private addTrafficPair(requestLine: string, responseLine: string): void {
    // Add simple summary lines to the small traffic log
    this.trafficLines.unshift(responseLine);
    this.trafficLines.unshift(requestLine);

    // Keep only last 100 lines
    if (this.trafficLines.length > 100) {
      this.trafficLines = this.trafficLines.slice(0, 100);
    }

    // Update the traffic box content
    this.layout.traffic.setContent(this.trafficLines.join("\n"));
    this.layout.traffic.setScrollPerc(0);
  }

  private addTrafficLine(line: string): void {
    this.trafficLines.unshift(line);
    if (this.trafficLines.length > 100) {
      this.trafficLines = this.trafficLines.slice(0, 100);
    }
    this.layout.traffic.setContent(this.trafficLines.join("\n"));
  }

  render() {
    // Set up the main UI first
    this.activePanel = "sidebar";
    this.updatePanelHighlight();
    this.layout.sidebar.focus();
    this.screen.render();

    // Show splash screen as overlay (auto-closes)
    this.showSplashScreen();
  }

  async prompt(label: string): Promise<string> {
    return new Promise((resolve) => {
      // Remember which panel was active before prompting
      const previousPanel = this.activePanel;

      this.layout.input.setLabel(` ${label} `);
      this.layout.input.show();
      this.layout.input.focus();

      this.layout.input.on("submit", (value) => {
        this.layout.input.hide();
        this.layout.input.clearValue();

        // Restore focus to the previously active panel
        switch (previousPanel) {
          case "sidebar":
            this.layout.sidebar.focus();
            break;
          case "main":
            this.layout.main.focus();
            break;
          case "traffic":
            this.layout.traffic.focus();
            break;
        }

        this.screen.render();
        resolve(value || "");
      });

      this.layout.input.on("cancel", () => {
        this.layout.input.hide();
        this.layout.input.clearValue();

        // Restore focus to the previously active panel
        switch (previousPanel) {
          case "sidebar":
            this.layout.sidebar.focus();
            break;
          case "main":
            this.layout.main.focus();
            break;
          case "traffic":
            this.layout.traffic.focus();
            break;
        }

        this.screen.render();
        resolve("");
      });

      this.screen.render();
    });
  }

  private async handleMainSelection(): Promise<void> {
    if (!this.client) return;

    const selectedIndex = (this.layout.main as any).selected || 0;
    const state = this.client.getState();

    try {
      switch (this.currentView) {
        case "tools":
          if (selectedIndex < state.tools.length) {
            await this.executeTool(state.tools[selectedIndex]);
          }
          break;

        case "resources":
          if (selectedIndex < state.resources.length) {
            await this.readResource(state.resources[selectedIndex]);
          }
          break;

        case "prompts":
          if (selectedIndex < state.prompts.length) {
            await this.usePrompt(state.prompts[selectedIndex]);
          }
          break;

        case "traffic":
          // Adjust for header rows (stats + blank + header + separator = 4 rows)
          const actualIndex = selectedIndex - 4;
          if (actualIndex >= 0) {
            await this.showTrafficDetailByIndex(actualIndex);
          }
          break;
      }
    } catch (error: any) {
      this.showMessage("Error", error.message || String(error), "red");
    }
  }

  private async executeTool(tool: MCPTool): Promise<void> {
    // Build arguments
    const args: any = {};

    if (tool.inputSchema?.properties) {
      const props = tool.inputSchema.properties;
      const required = tool.inputSchema.required || [];

      for (const paramName of Object.keys(props)) {
        const isRequired = required.includes(paramName);
        const prompt = `${paramName}${isRequired ? " (required)" : " (optional)"}:`;

        const value = await this.prompt(prompt);

        if (value || isRequired) {
          // Try to parse as JSON for complex types
          try {
            args[paramName] = JSON.parse(value);
          } catch {
            args[paramName] = value;
          }
        }
      }
    }

    const result = await this.client!.callTool(tool.name, args);
    const formatted = this.formatForDisplay(result);
    this.showMessage(`Tool Result: ${tool.name}`, formatted, "green");
  }

  private async readResource(resource: MCPResource): Promise<void> {
    let uri = resource.uri;

    // Check if URI contains parameters like {id}, {path}, etc.
    const paramMatches = uri.match(/\{([^}]+)\}/g);

    if (paramMatches) {
      // Extract parameter names and prompt for values
      for (const paramMatch of paramMatches) {
        const paramName = paramMatch.slice(1, -1); // Remove { and }
        const value = await this.prompt(`Enter value for {${paramName}}:`);

        if (!value) {
          this.showMessage(
            "Error",
            `Parameter {${paramName}} is required`,
            "red",
          );
          return;
        }

        // Replace the parameter in the URI
        uri = uri.replace(paramMatch, value);
      }
    }

    const result = await this.client!.readResource(uri);
    const formatted = this.formatForDisplay(result);
    this.showMessage(`Resource: ${resource.name}`, formatted, "cyan");
  }

  private async usePrompt(prompt: MCPPrompt): Promise<void> {
    const args: any = {};

    if (prompt.arguments && prompt.arguments.length > 0) {
      for (const arg of prompt.arguments) {
        const isRequired = arg.required || false;
        const promptText = `${arg.name}${isRequired ? " (required)" : " (optional)"}:`;

        const value = await this.prompt(promptText);

        if (value || isRequired) {
          args[arg.name] = value;
        }
      }
    }

    const result = await this.client!.getPrompt(prompt.name, args);
    const formatted = this.formatForDisplay(result);
    this.showMessage(`Prompt: ${prompt.name}`, formatted, "magenta");
  }

  private async showTrafficDetailByIndex(index: number): Promise<void> {
    const logs = this.client!.getTrafficLog();
    const filtered = this.filterTrafficLogs(logs);

    if (index < 0 || index >= filtered.length) return;

    const processedIds = new Set<number | string>();
    let currentIndex = 0;

    // Find the correct request/response pair at this index
    for (let i = 0; i < filtered.length; i++) {
      const log = filtered[i];

      // Skip if we already processed this request/response pair
      if ("id" in log.data) {
        const logId = (log.data as any).id;
        if (processedIds.has(logId)) continue;
        processedIds.add(logId);
      }

      if (currentIndex === index) {
        // Found the right pair, now get full request and response
        let requestLog = log;
        let responseLog = null;

        if (log.direction === "received" && "id" in log.data) {
          const requestId = (log.data as any).id;
          // Find the request in the full logs (not filtered)
          for (let j = 0; j < logs.length; j++) {
            if (
              logs[j].direction === "sent" &&
              "id" in logs[j].data &&
              (logs[j].data as any).id === requestId
            ) {
              requestLog = logs[j];
              responseLog = log;
              break;
            }
          }
        } else if (log.direction === "sent" && "id" in log.data) {
          const requestId = (log.data as any).id;
          // Find the response in the full logs (not filtered)
          for (let j = 0; j < logs.length; j++) {
            if (
              logs[j].direction === "received" &&
              "id" in logs[j].data &&
              (logs[j].data as any).id === requestId
            ) {
              responseLog = logs[j];
              break;
            }
          }
        }

        await this.showTrafficDetail(requestLog, responseLog);
        return;
      }

      currentIndex++;
    }
  }

  private async showTrafficDetail(
    requestLog: any,
    responseLog: any | null,
  ): Promise<void> {
    // Create a custom box with tabs for better viewing
    const detailBox = blessed.box({
      parent: this.screen,
      top: "center",
      left: "center",
      width: "95%",
      height: "90%",
      border: { type: "line" },
      style: {
        border: { fg: "cyan", bold: true },
      },
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: "█",
        track: { ch: "░" },
        style: { fg: "cyan", bg: "black" },
      },
    });

    let currentView: "request" | "response" | "both" = "both";

    const updateContent = () => {
      const requestJson = this.formatForDisplay(requestLog.data);
      const responseJson = responseLog
        ? this.formatForDisplay(responseLog.data)
        : "{yellow-fg}(pending - no response yet){/yellow-fg}";

      let content = "";
      let label = "";

      if (currentView === "request") {
        label =
          " REQUEST - Press TAB=Both | 2=Response | F4/ESC=Close | PgUp/PgDn=Scroll ";
        content = [
          "{bold}{yellow-fg}" + "═".repeat(120) + "{/yellow-fg}{/bold}",
          "{bold}{yellow-fg}  REQUEST{/yellow-fg}{/bold}",
          "{bold}{yellow-fg}" + "═".repeat(120) + "{/yellow-fg}{/bold}",
          "",
          "{cyan-fg}Timestamp:{/cyan-fg} " + requestLog.timestamp.toISOString(),
          "{cyan-fg}Transport:{/cyan-fg} " +
            (requestLog.transport || "unknown"),
          "{cyan-fg}Direction:{/cyan-fg} " + requestLog.direction,
          "",
          "{bold}{green-fg}JSON Data:{/green-fg}{/bold}",
          "{gray-fg}" + "─".repeat(120) + "{/gray-fg}",
          requestJson,
          "",
        ].join("\n");
      } else if (currentView === "response") {
        label =
          " RESPONSE - Press TAB=Both | 1=Request | F4/ESC=Close | PgUp/PgDn=Scroll ";
        if (responseLog) {
          content = [
            "{bold}{green-fg}" + "═".repeat(120) + "{/green-fg}{/bold}",
            "{bold}{green-fg}  RESPONSE{/green-fg}{/bold}",
            "{bold}{green-fg}" + "═".repeat(120) + "{/green-fg}{/bold}",
            "",
            "{cyan-fg}Timestamp:{/cyan-fg} " +
              responseLog.timestamp.toISOString(),
            "{cyan-fg}Transport:{/cyan-fg} " +
              (responseLog.transport || "unknown"),
            "{cyan-fg}Direction:{/cyan-fg} " + responseLog.direction,
            "{cyan-fg}Duration:{/cyan-fg} " +
              (responseLog.timestamp.getTime() -
                requestLog.timestamp.getTime()) +
              "ms",
            "",
            "{bold}{green-fg}JSON Data:{/green-fg}{/bold}",
            "{gray-fg}" + "─".repeat(120) + "{/gray-fg}",
            responseJson,
            "",
          ].join("\n");
        } else {
          content = [
            "{bold}{yellow-fg}" + "═".repeat(120) + "{/yellow-fg}{/bold}",
            "{bold}{yellow-fg}  RESPONSE{/yellow-fg}{/bold}",
            "{bold}{yellow-fg}" + "═".repeat(120) + "{/yellow-fg}{/bold}",
            "",
            "{yellow-fg}(pending - no response yet){/yellow-fg}",
            "",
          ].join("\n");
        }
      } else {
        // Both view - side by side with proper column wrapping
        label =
          " REQUEST & RESPONSE - Press 1=Request Only | 2=Response Only | F4/ESC=Close | PgUp/PgDn=Scroll ";

        const requestLines = requestJson.split("\n");
        const responseLines = responseJson.split("\n");

        // Calculate dynamic column width based on screen
        const colWidth = 65;

        // Wrap lines that are too long for each column
        const wrapLine = (line: string, width: number): string[] => {
          if (!line) return [""];

          const wrapped: string[] = [];
          let currentLine = line;

          while (currentLine.length > 0) {
            // Check for color tags and preserve them
            const stripped = currentLine.replace(/\{[^}]+\}/g, "");

            if (stripped.length <= width) {
              wrapped.push(currentLine);
              break;
            }

            // Find a good break point (space, comma, etc.) within width
            let breakPoint = width;
            const visiblePart = stripped.substring(0, width);
            const lastSpace = Math.max(
              visiblePart.lastIndexOf(" "),
              visiblePart.lastIndexOf(","),
              visiblePart.lastIndexOf(";"),
            );

            if (lastSpace > width * 0.6) {
              // Only break at space if it's not too early
              breakPoint = lastSpace + 1;
            }

            // Extract the part to add (accounting for color tags)
            let charCount = 0;
            let cutIndex = 0;
            let inTag = false;

            for (
              let i = 0;
              i < currentLine.length && charCount < breakPoint;
              i++
            ) {
              if (currentLine[i] === "{") {
                inTag = true;
              } else if (currentLine[i] === "}") {
                inTag = false;
              } else if (!inTag) {
                charCount++;
              }
              cutIndex = i + 1;
            }

            wrapped.push(currentLine.substring(0, cutIndex).trimEnd());
            currentLine = currentLine.substring(cutIndex).trimStart();
          }

          return wrapped.length > 0 ? wrapped : [""];
        };

        // Wrap all request and response lines
        const wrappedRequestLines: string[] = [];
        const wrappedResponseLines: string[] = [];

        requestLines.forEach((line) => {
          wrappedRequestLines.push(...wrapLine(line, colWidth));
        });

        responseLines.forEach((line) => {
          wrappedResponseLines.push(...wrapLine(line, colWidth));
        });

        const maxLines = Math.max(
          wrappedRequestLines.length,
          wrappedResponseLines.length,
        );

        const lines: string[] = [];
        lines.push(
          "{bold}{cyan-fg}" +
            "═".repeat(colWidth) +
            "╦" +
            "═".repeat(colWidth) +
            "{/cyan-fg}{/bold}",
        );

        // Add metadata header
        const reqTime = requestLog.timestamp.toISOString();
        const respTime = responseLog
          ? responseLog.timestamp.toISOString()
          : "pending";
        const duration = responseLog
          ? `${responseLog.timestamp.getTime() - requestLog.timestamp.getTime()}ms`
          : "-";

        const headerLeft = `{bold}{yellow-fg}REQUEST{/yellow-fg}{/bold} (${reqTime})`;
        const headerRight = `{bold}{green-fg}RESPONSE{/green-fg}{/bold} (${respTime}) Duration: ${duration}`;

        // Calculate padding for header (accounting for color tags)
        const headerLeftStripped = headerLeft.replace(/\{[^}]+\}/g, "");
        const headerLeftPadding = " ".repeat(
          Math.max(0, colWidth - headerLeftStripped.length),
        );

        lines.push(
          headerLeft + headerLeftPadding + "{cyan-fg}║{/cyan-fg}" + headerRight,
        );
        lines.push(
          "{bold}{cyan-fg}" +
            "─".repeat(colWidth) +
            "╫" +
            "─".repeat(colWidth) +
            "{/cyan-fg}{/bold}",
        );

        for (let i = 0; i < maxLines; i++) {
          const leftLine = wrappedRequestLines[i] || "";
          const rightLine = wrappedResponseLines[i] || "";

          // Pad left line to exact column width (accounting for color tags)
          const leftStripped = leftLine.replace(/\{[^}]+\}/g, "");
          const leftPadding = " ".repeat(
            Math.max(0, colWidth - leftStripped.length),
          );

          lines.push(
            leftLine + leftPadding + "{cyan-fg}║{/cyan-fg}" + rightLine,
          );
        }

        lines.push(
          "{bold}{cyan-fg}" +
            "═".repeat(colWidth) +
            "╩" +
            "═".repeat(colWidth) +
            "{/cyan-fg}{/bold}",
        );

        content = lines.join("\n");
      }

      detailBox.setLabel(label);
      detailBox.setContent(content);
      this.screen.render();
    };

    // Initial render
    updateContent();

    // Key bindings
    detailBox.key(["tab"], () => {
      currentView = "both";
      updateContent();
    });

    detailBox.key(["1"], () => {
      currentView = "request";
      updateContent();
    });

    detailBox.key(["2"], () => {
      currentView = "response";
      updateContent();
    });

    detailBox.key(["pageup"], () => {
      detailBox.scroll(-10);
      this.screen.render();
    });

    detailBox.key(["pagedown"], () => {
      detailBox.scroll(10);
      this.screen.render();
    });

    detailBox.key(["f4", "escape", "q"], () => {
      detailBox.destroy();
      this.screen.render();
    });

    detailBox.focus();
    this.screen.render();
  }

  private formatXML(xml: string): string {
    // Simple XML formatter with indentation
    let formatted = "";
    let indent = 0;
    const tab = "  ";

    xml.split(/>\s*</).forEach((node, index) => {
      // Add back the angle brackets
      if (index > 0) node = "<" + node;
      if (index < xml.split(/>\s*</).length - 1) node = node + ">";

      // Check if it's a closing tag
      if (node.match(/^<\/\w/)) {
        indent--;
      }

      // Add the indented line
      formatted += tab.repeat(Math.max(0, indent)) + node + "\n";

      // Check if it's an opening tag (not self-closing and not closing)
      if (node.match(/^<\w[^>]*[^\/]>$/)) {
        indent++;
      }
    });

    // Add syntax highlighting for XML
    return formatted
      .replace(/<(\/?[\w:]+)/g, "{cyan-fg}<$1{/cyan-fg}") // Tag names
      .replace(/([\w:]+)=/g, "{yellow-fg}$1{/yellow-fg}=") // Attributes
      .replace(/="([^"]*)"/g, '="{green-fg}$1{/green-fg}"') // Attribute values
      .replace(/>/g, "{cyan-fg}>{/cyan-fg}"); // Closing brackets
  }

  private formatForDisplay(data: any): string {
    // Smart formatter for better readability
    if (typeof data === "string") {
      // Check if it's XML
      if (data.trim().startsWith("<") && data.trim().includes("</")) {
        try {
          return this.formatXML(data);
        } catch {
          // If XML formatting fails, continue to JSON attempt
        }
      }

      // Try to parse as JSON for better formatting
      try {
        const parsed = JSON.parse(data);
        const json = JSON.stringify(parsed, null, 2);

        // Add color hints for better readability
        return json
          .replace(/"([^"]+)":/g, '{cyan-fg}"$1"{/cyan-fg}:') // Property names
          .replace(/: "([^"]*?)"/g, ': {green-fg}"$1"{/green-fg}') // String values
          .replace(/: (\d+)/g, ": {yellow-fg}$1{/yellow-fg}") // Numbers
          .replace(/: (true|false|null)/g, ": {magenta-fg}$1{/magenta-fg}"); // Keywords
      } catch {
        // Not JSON, return as-is
        return data;
      }
    }

    if (typeof data === "object" && data !== null) {
      // Format objects with syntax highlighting hints
      const json = JSON.stringify(data, null, 2);

      // Add color hints for better readability
      return json
        .replace(/"([^"]+)":/g, '{cyan-fg}"$1"{/cyan-fg}:') // Property names
        .replace(/: "([^"]*?)"/g, ': {green-fg}"$1"{/green-fg}') // String values
        .replace(/: (\d+)/g, ": {yellow-fg}$1{/yellow-fg}") // Numbers
        .replace(/: (true|false|null)/g, ": {magenta-fg}$1{/magenta-fg}"); // Keywords
    }

    return String(data);
  }

  private showMessage(title: string, content: string, color: string): void {
    // Store both raw and rendered versions
    const rawContent = content;
    const renderedContent = content.replace(/\\n/g, "\n").replace(/\\t/g, "  ");

    // Store for toggling
    this.currentPopupContent = {
      raw: rawContent,
      rendered: renderedContent,
      title,
      color,
    };
    this.showRawInPopup = false;

    const msg = blessed.box({
      parent: this.screen,
      top: "center",
      left: "center",
      width: "90%",
      height: "85%",
      label: ` ${title} - F4/ESC=close W=toggle PgUp/PgDn=scroll `,
      tags: true,
      border: { type: "line" },
      style: {
        border: { fg: color, bold: true },
      },
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: "█",
        track: {
          ch: "░",
        },
        style: {
          fg: color,
          bg: "black",
        },
      },
      content: this.showRawInPopup ? rawContent : renderedContent,
    });

    // Page Up/Page Down for scrolling
    msg.key(["pageup"], () => {
      msg.scroll(-10);
      this.screen.render();
    });

    msg.key(["pagedown"], () => {
      msg.scroll(10);
      this.screen.render();
    });

    // W to toggle between raw and rendered
    msg.key(["w", "W"], () => {
      this.showRawInPopup = !this.showRawInPopup;
      if (this.currentPopupContent) {
        msg.setContent(
          this.showRawInPopup
            ? this.currentPopupContent.raw
            : this.currentPopupContent.rendered,
        );
        msg.setLabel(
          ` ${this.currentPopupContent.title} - Press F4/ESC to close, W to toggle raw/rendered ${this.showRawInPopup ? "(RAW)" : "(RENDERED)"} `,
        );
        this.screen.render();
      }
    });

    // F4 or ESC to close
    msg.key(["f4", "escape", "enter"], () => {
      this.currentPopupContent = null;
      this.showRawInPopup = false;
      msg.destroy();
      this.screen.render();
    });

    msg.focus();
    this.screen.render();
  }

  private generateConfigFilename(
    config: TransportConfig,
    serverName: string,
  ): string {
    const parts: string[] = [];

    // Add protocol/transport type
    parts.push(config.type);

    // Add connection details based on type
    if (config.type === "stdio" && config.command) {
      // For stdio: protocol-command-arg1-arg2
      parts.push(config.command.replace(/[^a-zA-Z0-9-_]/g, "_"));
      if (config.args && config.args.length > 0) {
        const firstArg = config.args[0]
          .replace(/[^a-zA-Z0-9-_]/g, "_")
          .substring(0, 20);
        if (firstArg) parts.push(firstArg);
      }
    } else if (config.url) {
      // For HTTP/WebSocket: protocol-hostname-port
      try {
        const url = new URL(config.url);
        parts.push(url.hostname.replace(/[^a-zA-Z0-9-_]/g, "_"));
        if (url.port) {
          parts.push(`port${url.port}`);
        }
        if (url.pathname && url.pathname !== "/") {
          const pathPart = url.pathname
            .replace(/[^a-zA-Z0-9-_]/g, "_")
            .substring(0, 20);
          if (pathPart) parts.push(pathPart);
        }
      } catch {
        // If URL parsing fails, use sanitized URL
        const urlPart = config.url
          .replace(/[^a-zA-Z0-9-_]/g, "_")
          .substring(0, 30);
        if (urlPart) parts.push(urlPart);
      }
    }

    // Add proxy info if present
    if (config.proxy) {
      parts.push("proxy");
      if (config.proxy.host) {
        parts.push(config.proxy.host.replace(/[^a-zA-Z0-9-_]/g, "_"));
      }
      if (config.proxy.port) {
        parts.push(`p${config.proxy.port}`);
      }
    }

    // Add auth info if present
    if (config.auth) {
      parts.push(config.auth.type || "auth");
    }

    // Add server name (shortened)
    const sanitizedServerName = serverName
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .toLowerCase()
      .substring(0, 20);
    if (sanitizedServerName) {
      parts.push(sanitizedServerName);
    }

    // Join parts and limit total length
    let filename = parts.join("-");
    if (filename.length > 100) {
      filename = filename.substring(0, 100);
    }

    return `${filename}.mcpconn`;
  }

  private configsAreEqual(
    config1: TransportConfig,
    config2: TransportConfig,
  ): boolean {
    // Deep comparison of configs (excluding _saved metadata and undefined values)
    const normalize = (config: TransportConfig): string => {
      const normalized: any = {};

      // Copy only defined properties
      if (config.type !== undefined) normalized.type = config.type;
      if (config.url !== undefined) normalized.url = config.url;
      if (config.command !== undefined) normalized.command = config.command;
      if (config.args !== undefined) {
        // Sort arrays for comparison
        normalized.args = Array.isArray(config.args)
          ? [...config.args].sort()
          : config.args;
      }
      if (config.env !== undefined) {
        // Sort env object keys for comparison
        const envKeys = Object.keys(config.env).sort();
        normalized.env = {};
        for (const key of envKeys) {
          normalized.env[key] = config.env![key];
        }
      }
      if (config.proxy !== undefined) {
        normalized.proxy = { ...config.proxy };
        if (config.proxy.auth !== undefined) {
          normalized.proxy.auth = { ...config.proxy.auth };
        }
      }
      if (config.auth !== undefined) {
        normalized.auth = { ...config.auth };
        if (config.auth.headers !== undefined) {
          const headerKeys = Object.keys(config.auth.headers).sort();
          normalized.auth.headers = {};
          for (const key of headerKeys) {
            normalized.auth.headers[key] = config.auth.headers![key];
          }
        }
      }
      if (config.certificate !== undefined) {
        normalized.certificate = { ...config.certificate };
      }
      if (config.headers !== undefined) {
        const headerKeys = Object.keys(config.headers).sort();
        normalized.headers = {};
        for (const key of headerKeys) {
          normalized.headers[key] = config.headers[key];
        }
      }

      // Sort top-level keys for consistent comparison
      const sortedKeys = Object.keys(normalized).sort();
      const sorted: any = {};
      for (const key of sortedKeys) {
        sorted[key] = normalized[key];
      }

      return JSON.stringify(sorted);
    };

    return normalize(config1) === normalize(config2);
  }

  private findExistingConfig(config: TransportConfig): string | null {
    try {
      const cwd = process.cwd();
      const files = fs.readdirSync(cwd);

      for (const file of files) {
        if (file.endsWith(".mcpconn")) {
          try {
            const filepath = path.join(cwd, file);
            const content = fs.readFileSync(filepath, "utf-8");
            const savedConfig = JSON.parse(content) as TransportConfig & {
              _saved?: any;
            };

            // Remove _saved metadata for comparison
            const { _saved, ...cleanConfig } = savedConfig;

            if (this.configsAreEqual(config, cleanConfig)) {
              return filepath;
            }
          } catch {
            // Skip invalid files
            continue;
          }
        }
      }
    } catch {
      // If directory read fails, return null
    }

    return null;
  }

  private saveConnectionConfig(
    config: TransportConfig,
    serverName: string,
  ): void {
    try {
      // Check if identical config already exists
      const existingPath = this.findExistingConfig(config);
      if (existingPath) {
        // Update timestamp in existing file
        const content = fs.readFileSync(existingPath, "utf-8");
        const existingConfig = JSON.parse(content) as TransportConfig & {
          _saved?: { timestamp: string; serverName: string };
        };

        existingConfig._saved = {
          timestamp: new Date().toISOString(),
          serverName: serverName,
        };

        fs.writeFileSync(
          existingPath,
          JSON.stringify(existingConfig, null, 2),
          "utf-8",
        );
        this.addTrafficLine(
          `{yellow-fg}Connection updated:{/yellow-fg} ${path.basename(existingPath)} (no changes detected)`,
        );
        this.screen.render();
        return;
      }

      // Generate descriptive filename
      const filename = this.generateConfigFilename(config, serverName);
      const cwd = process.cwd();
      const filepath = path.join(cwd, filename);

      // If file already exists with same name, append timestamp
      let finalFilepath = filepath;
      if (fs.existsSync(filepath)) {
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .slice(0, 19);
        const baseName = filename.replace(".mcpconn", "");
        finalFilepath = path.join(cwd, `${baseName}-${timestamp}.mcpconn`);
      }

      const configToSave = {
        ...config,
        _saved: {
          timestamp: new Date().toISOString(),
          serverName: serverName,
        },
      };

      fs.writeFileSync(
        finalFilepath,
        JSON.stringify(configToSave, null, 2),
        "utf-8",
      );
      this.addTrafficLine(
        `{green-fg}Connection saved:{/green-fg} ${path.basename(finalFilepath)}`,
      );
      this.screen.render();
    } catch (error) {
      this.addTrafficLine(
        `{red-fg}Failed to save connection:{/red-fg} ${error instanceof Error ? error.message : String(error)}`,
      );
      this.screen.render();
    }
  }

  private getSavedConnections(): Array<{
    filepath: string;
    config: TransportConfig;
    serverName: string;
    timestamp: string;
  }> {
    const connections: Array<{
      filepath: string;
      config: TransportConfig;
      serverName: string;
      timestamp: string;
    }> = [];

    try {
      const cwd = process.cwd();
      const files = fs.readdirSync(cwd);

      for (const file of files) {
        if (file.endsWith(".mcpconn")) {
          try {
            const filepath = path.join(cwd, file);
            const content = fs.readFileSync(filepath, "utf-8");
            const config = JSON.parse(content) as TransportConfig & {
              _saved?: { timestamp: string; serverName: string };
            };

            const serverName =
              config._saved?.serverName ||
              this.getConnectionDisplayName(config);
            const timestamp =
              config._saved?.timestamp ||
              new Date(fs.statSync(filepath).mtime).toISOString();

            // Remove _saved metadata for the actual config
            const { _saved, ...cleanConfig } = config;

            connections.push({
              filepath,
              config: cleanConfig,
              serverName,
              timestamp,
            });
          } catch (error) {
            // Skip invalid files
            continue;
          }
        }
      }

      // Sort by timestamp, most recent first
      connections.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    } catch (error) {
      // If directory read fails, return empty array
    }

    return connections;
  }

  private getConnectionDisplayName(config: TransportConfig): string {
    if (config.type === "stdio" && config.command) {
      return `${config.command} ${(config.args || []).slice(0, 2).join(" ")}`;
    } else if (config.url) {
      try {
        const url = new URL(config.url);
        return `${config.type}://${url.hostname}${url.port ? ":" + url.port : ""}`;
      } catch {
        return config.url;
      }
    }
    return `${config.type} connection`;
  }

  private showSavedConnections(): void {
    const connections = this.getSavedConnections();

    if (connections.length === 0) {
      this.showMessage(
        "No Saved Connections",
        "{yellow-fg}No saved connections found in current directory.{/yellow-fg}\n\n" +
          "Connections are automatically saved when you successfully connect to a server.\n" +
          "Saved files use the extension: {cyan-fg}.mcpconn{/cyan-fg}",
        "yellow",
      );
      return;
    }

    const items = connections.map((conn, index) => {
      const date = new Date(conn.timestamp);
      const dateStr = date.toLocaleString();
      const filename = path.basename(conn.filepath, ".mcpconn");

      // Show filename details if it contains useful info
      let displayName = conn.serverName;
      if (
        filename.length > 0 &&
        filename !==
          conn.serverName.replace(/[^a-zA-Z0-9-_]/g, "_").toLowerCase()
      ) {
        // Filename has more details, show both
        displayName = `${conn.serverName} - ${filename.substring(0, 40)}`;
      }

      return `${index + 1}. ${displayName}\n   ${dateStr}`;
    });

    const list = blessed.list({
      parent: this.screen,
      top: "center",
      left: "center",
      width: "85%",
      height: Math.min(connections.length * 2 + 4, 20),
      border: {
        type: "line",
      },
      style: {
        border: {
          fg: "cyan",
        },
        selected: {
          bg: "blue",
        },
      },
      keys: true,
      vi: true,
      items: items,
      label: " Saved Connections (F4 to close, Enter to switch) ",
    });

    list.on("select", async (item, index) => {
      const selectedConnection = connections[index];
      list.destroy();
      this.screen.render();

      await this.switchConnection(
        selectedConnection.config,
        selectedConnection.filepath,
      );
    });

    list.key(["escape", "f4"], () => {
      list.destroy();
      this.screen.render();
    });

    list.focus();
    this.screen.render();
  }

  private async switchConnection(
    config: TransportConfig,
    filepath: string,
  ): Promise<void> {
    try {
      // Show loading message
      this.layout.status.setContent(
        "{yellow-fg}Switching connection...{/yellow-fg}",
      );
      this.screen.render();

      // Disconnect and remove old client if exists
      if (this.client) {
        try {
          // Remove all event listeners first
          this.client.removeAllListeners();
          await this.client.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        this.client = undefined;
      }

      // Clear current state
      this.trafficLines = [];
      this.trafficPairs = [];
      this.layout.traffic.setContent("");
      this.layout.main.setItems([]);
      this.currentView = "tools";

      // Create new client with the saved config
      const newClient = new MCPClient(config);

      // Set up client and event handlers BEFORE connecting
      this.setClient(newClient, config);

      // Connect and wait for it to complete
      await newClient.connect();

      // Wait a moment for the UI to update from the 'connected' event
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.addTrafficLine(
        `{green-fg}Switched to connection:{/green-fg} ${path.basename(filepath)}`,
      );
      this.screen.render();
    } catch (error) {
      this.layout.status.setContent(
        `{red-fg}Failed to switch connection:{/red-fg} ${error instanceof Error ? error.message : String(error)}`,
      );
      this.addTrafficLine(
        `{red-fg}Connection switch failed:{/red-fg} ${error instanceof Error ? error.message : String(error)}`,
      );
      this.screen.render();
    }
  }

  // Enhanced traffic log features
  private showFilterDialog() {
    const filterBox = blessed.box({
      parent: this.screen,
      label: " Filter Traffic ",
      top: "center",
      left: "center",
      width: "60%",
      height: "60%",
      border: { type: "line" },
      style: {
        border: { fg: "cyan" },
      },
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: {
        ch: " ",
        style: { bg: "cyan" },
      },
    });

    // Get unique methods and transports
    const logs = this.client?.getTrafficLog() || [];
    const methods = new Set<string>();
    const transports = new Set<string>();

    logs.forEach((log) => {
      if ("method" in log.data) methods.add(log.data.method);
      if (log.transport) transports.add(log.transport);
    });

    const content = [
      "{bold}{cyan-fg}Current Filters:{/cyan-fg}{/bold}",
      `  Method: ${this.trafficFilter.method || "{gray-fg}(none){/gray-fg}"}`,
      `  Transport: ${this.trafficFilter.transport || "{gray-fg}(none){/gray-fg}"}`,
      `  Status: ${this.trafficFilter.status}`,
      `  Search: ${this.trafficFilter.searchText || "{gray-fg}(none){/gray-fg}"}`,
      "",
      "{bold}{yellow-fg}Available Options:{/yellow-fg}{/bold}",
      "",
      "{cyan-fg}Methods:{/cyan-fg}",
      ...Array.from(methods).map((m) => `  - ${m}`),
      "",
      "{cyan-fg}Transports:{/cyan-fg}",
      ...Array.from(transports).map((t) => `  - ${t}`),
      "",
      "{cyan-fg}Status Values:{/cyan-fg}",
      "  - all",
      "  - success",
      "  - error",
      "  - pending",
      "",
      "{bold}{green-fg}Actions:{/green-fg}{/bold}",
      "  1. Press M to filter by method",
      "  2. Press T to filter by transport",
      "  3. Press S to filter by status",
      "  4. Press C to clear all filters",
      "  5. Press ESC or F4 to close",
    ];

    filterBox.setContent(content.join("\n"));

    filterBox.key(["m"], () => {
      this.layout.input.setLabel(
        " Enter method to filter (or leave empty to clear) ",
      );
      this.layout.input.setValue(this.trafficFilter.method || "");
      this.layout.input.show();
      this.layout.input.focus();
      this.layout.input.readInput((err, value) => {
        if (!err) {
          this.trafficFilter.method =
            value && value.trim() ? value.trim() : null;
          this.updateCurrentView();
        }
        this.layout.input.hide();
        filterBox.focus();
        this.screen.render();
      });
    });

    filterBox.key(["t"], () => {
      this.layout.input.setLabel(
        " Enter transport to filter (or leave empty to clear) ",
      );
      this.layout.input.setValue(this.trafficFilter.transport || "");
      this.layout.input.show();
      this.layout.input.focus();
      this.layout.input.readInput((err, value) => {
        if (!err) {
          this.trafficFilter.transport =
            value && value.trim() ? value.trim() : null;
          this.updateCurrentView();
        }
        this.layout.input.hide();
        filterBox.focus();
        this.screen.render();
      });
    });

    filterBox.key(["s"], () => {
      this.layout.input.setLabel(
        " Enter status filter (all/success/error/pending) ",
      );
      this.layout.input.setValue(this.trafficFilter.status);
      this.layout.input.show();
      this.layout.input.focus();
      this.layout.input.readInput((err, value) => {
        if (!err && value) {
          const status = value.trim().toLowerCase();
          if (["all", "success", "error", "pending"].includes(status)) {
            this.trafficFilter.status = status as any;
            this.updateCurrentView();
          }
        }
        this.layout.input.hide();
        filterBox.focus();
        this.screen.render();
      });
    });

    filterBox.key(["c"], () => {
      this.trafficFilter.method = null;
      this.trafficFilter.transport = null;
      this.trafficFilter.status = "all";
      this.trafficFilter.searchText = "";
      this.updateCurrentView();
      filterBox.destroy();
      this.screen.render();
    });

    filterBox.key(["escape", "f4"], () => {
      filterBox.destroy();
      this.screen.render();
    });

    this.screen.render();
    filterBox.focus();
  }

  private showSearchDialog() {
    this.layout.input.setLabel(
      " Search traffic (use /regex/ for regex search) ",
    );
    this.layout.input.setValue(this.trafficFilter.searchText);
    this.layout.input.show();
    this.layout.input.focus();
    this.layout.input.readInput((err, value) => {
      if (!err) {
        let searchText = value || "";
        let useRegex = false;

        // Check if it's a regex pattern
        if (
          searchText.startsWith("/") &&
          searchText.endsWith("/") &&
          searchText.length > 2
        ) {
          searchText = searchText.slice(1, -1);
          useRegex = true;
        }

        this.trafficFilter.searchText = searchText;
        this.trafficFilter.useRegex = useRegex;
        this.updateCurrentView();
      }
      this.layout.input.hide();
      this.screen.render();
    });
  }

  private showExportDialog() {
    const exportBox = blessed.box({
      parent: this.screen,
      label: " Export Traffic ",
      top: "center",
      left: "center",
      width: "50%",
      height: "50%",
      border: { type: "line" },
      style: {
        border: { fg: "cyan" },
      },
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
    });

    const content = [
      "{bold}{cyan-fg}Export Traffic Data{/cyan-fg}{/bold}",
      "",
      "Choose export format:",
      "",
      "{yellow-fg}1.{/yellow-fg} Press J to export as JSON",
      "{yellow-fg}2.{/yellow-fg} Press C to export as CSV",
      "{yellow-fg}3.{/yellow-fg} Press ESC to cancel",
      "",
      `Current filter will export {bold}${this.filterTrafficLogs(this.client?.getTrafficLog() || []).length}{/bold} records`,
    ];

    exportBox.setContent(content.join("\n"));

    exportBox.key(["j"], () => {
      this.exportTrafficJSON();
      exportBox.destroy();
      this.screen.render();
    });

    exportBox.key(["c"], () => {
      this.exportTrafficCSV();
      exportBox.destroy();
      this.screen.render();
    });

    exportBox.key(["escape", "f4"], () => {
      exportBox.destroy();
      this.screen.render();
    });

    this.screen.render();
    exportBox.focus();
  }

  private exportTrafficJSON() {
    try {
      const logs = this.client?.getTrafficLog() || [];
      const filtered = this.filterTrafficLogs(logs);

      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];
      const filename = `traffic_export_${timestamp}.json`;
      const filepath = path.join(process.cwd(), filename);

      fs.writeFileSync(filepath, JSON.stringify(filtered, null, 2));

      this.addTrafficLine(
        `{green-fg}Exported ${filtered.length} records to:{/green-fg} ${filename}`,
      );
      this.screen.render();
    } catch (error) {
      this.addTrafficLine(
        `{red-fg}Export failed:{/red-fg} ${error instanceof Error ? error.message : String(error)}`,
      );
      this.screen.render();
    }
  }

  private exportTrafficCSV() {
    try {
      const logs = this.client?.getTrafficLog() || [];
      const filtered = this.filterTrafficLogs(logs);

      // Build CSV
      const headers = [
        "Timestamp",
        "Direction",
        "Transport",
        "Method",
        "Status",
        "Data",
      ];
      const rows = filtered.map((log) => {
        const method = "method" in log.data ? log.data.method : "";
        const status =
          log.direction === "received"
            ? "error" in log.data
              ? "ERROR"
              : "OK"
            : "SENT";
        const data = JSON.stringify(log.data).replace(/"/g, '""'); // Escape quotes

        return [
          log.timestamp.toISOString(),
          log.direction,
          log.transport || "",
          method,
          status,
          `"${data}"`,
        ].join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");

      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];
      const filename = `traffic_export_${timestamp}.csv`;
      const filepath = path.join(process.cwd(), filename);

      fs.writeFileSync(filepath, csv);

      this.addTrafficLine(
        `{green-fg}Exported ${filtered.length} records to:{/green-fg} ${filename}`,
      );
      this.screen.render();
    } catch (error) {
      this.addTrafficLine(
        `{red-fg}Export failed:{/red-fg} ${error instanceof Error ? error.message : String(error)}`,
      );
      this.screen.render();
    }
  }

  private showStatsDialog() {
    const statsBox = blessed.box({
      parent: this.screen,
      label: " Traffic Statistics ",
      top: "center",
      left: "center",
      width: "70%",
      height: "80%",
      border: { type: "line" },
      style: {
        border: { fg: "cyan" },
      },
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: {
        ch: " ",
        style: { bg: "cyan" },
      },
    });

    const successRate =
      this.trafficStats.totalRequests > 0
        ? (
            (this.trafficStats.successCount / this.trafficStats.totalRequests) *
            100
          ).toFixed(1)
        : "0.0";
    const errorRate =
      this.trafficStats.totalRequests > 0
        ? (
            (this.trafficStats.errorCount / this.trafficStats.totalRequests) *
            100
          ).toFixed(1)
        : "0.0";

    const content = [
      "{bold}{cyan-fg}═══════════════════════════════════════════════════════════════{/cyan-fg}{/bold}",
      "{bold}{cyan-fg}                    TRAFFIC STATISTICS                          {/cyan-fg}{/bold}",
      "{bold}{cyan-fg}═══════════════════════════════════════════════════════════════{/cyan-fg}{/bold}",
      "",
      "{bold}{yellow-fg}Overall Statistics:{/yellow-fg}{/bold}",
      `  Total Requests:     {bold}${this.trafficStats.totalRequests}{/bold}`,
      `  Successful:         {green-fg}{bold}${this.trafficStats.successCount}{/bold}{/green-fg} (${successRate}%)`,
      `  Errors:             {red-fg}{bold}${this.trafficStats.errorCount}{/bold}{/red-fg} (${errorRate}%)`,
      `  Pending:            {yellow-fg}{bold}${this.trafficStats.pendingCount}{/bold}{/yellow-fg}`,
      `  Avg Response Time:  {bold}${this.trafficStats.avgResponseTime.toFixed(0)}ms{/bold}`,
      "",
      "{bold}{yellow-fg}Method Distribution:{/yellow-fg}{/bold}",
    ];

    // Sort methods by count
    const sortedMethods = Array.from(
      this.trafficStats.methodCounts.entries(),
    ).sort((a, b) => b[1] - a[1]);

    sortedMethods.forEach(([method, count]) => {
      const percentage = (
        (count / this.trafficStats.totalRequests) *
        100
      ).toFixed(1);
      const barLength = Math.round(
        (count / this.trafficStats.totalRequests) * 40,
      );
      const bar = "█".repeat(barLength);
      content.push(
        `  ${method.padEnd(25)} {cyan-fg}${bar}{/cyan-fg} ${count} (${percentage}%)`,
      );
    });

    content.push("");
    content.push("{bold}{green-fg}Press ESC or F4 to close{/green-fg}{/bold}");

    statsBox.setContent(content.join("\n"));

    statsBox.key(["escape", "f4"], () => {
      statsBox.destroy();
      this.screen.render();
    });

    this.screen.render();
    statsBox.focus();
  }

  private replaySelectedRequest() {
    if (!this.client) return;

    const selected = (this.layout.main as any).selected || 0;
    const logs = this.client.getTrafficLog();
    const filtered = this.filterTrafficLogs(logs);

    // Adjust for header rows (stats + blank + header + separator = 4 rows)
    const actualIndex = selected - 4;
    if (actualIndex < 0 || actualIndex >= filtered.length) return;

    const processedIds = new Set<number | string>();
    let currentIndex = 0;

    for (let i = 0; i < filtered.length; i++) {
      const log = filtered[i];

      if ("id" in log.data) {
        const logId = (log.data as any).id;
        if (processedIds.has(logId)) continue;
        processedIds.add(logId);
      }

      if (currentIndex === actualIndex) {
        // Found the request
        if (log.direction === "sent" && "method" in log.data) {
          // Show confirmation dialog
          const confirmBox = blessed.box({
            parent: this.screen,
            label: " Replay Request? ",
            top: "center",
            left: "center",
            width: "60%",
            height: "50%",
            border: { type: "line" },
            style: {
              border: { fg: "yellow" },
            },
            tags: true,
            keys: true,
          });

          const method = log.data.method;
          const params = (log.data as any).params || {};

          confirmBox.setContent(
            [
              "{bold}{yellow-fg}Replay this request?{/yellow-fg}{/bold}",
              "",
              `{cyan-fg}Method:{/cyan-fg} ${method}`,
              `{cyan-fg}Parameters:{/cyan-fg}`,
              JSON.stringify(params, null, 2),
              "",
              "{green-fg}Press Y to replay, N to cancel{/green-fg}",
            ].join("\n"),
          );

          confirmBox.key(["y"], async () => {
            confirmBox.destroy();
            try {
              // Replay the request based on method type
              let result;
              switch (method) {
                case "tools/call":
                  result = await this.client!.callTool(
                    params.name,
                    params.arguments,
                  );
                  break;
                case "resources/read":
                  result = await this.client!.readResource(params.uri);
                  break;
                case "prompts/get":
                  result = await this.client!.getPrompt(
                    params.name,
                    params.arguments,
                  );
                  break;
                case "tools/list":
                  result = await this.client!.listTools();
                  break;
                case "resources/list":
                  result = await this.client!.listResources();
                  break;
                case "prompts/list":
                  result = await this.client!.listPrompts();
                  break;
                default:
                  throw new Error(`Cannot replay method: ${method}`);
              }
              this.addTrafficLine(
                `{green-fg}Replayed request:{/green-fg} ${method}`,
              );
            } catch (error) {
              this.addTrafficLine(
                `{red-fg}Replay failed:{/red-fg} ${error instanceof Error ? error.message : String(error)}`,
              );
            }
            this.screen.render();
          });

          confirmBox.key(["n", "escape"], () => {
            confirmBox.destroy();
            this.screen.render();
          });

          this.screen.render();
          confirmBox.focus();
        }
        break;
      }

      currentIndex++;
    }
  }
}
