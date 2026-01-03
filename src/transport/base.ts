import { EventEmitter } from "events";
import { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from "../types";

export abstract class Transport extends EventEmitter {
  protected requestId = 0;
  protected pendingRequests = new Map<
    number | string,
    {
      resolve: (value: any) => void;
      reject: (error: any) => void;
    }
  >();

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(data: JsonRpcRequest | JsonRpcNotification): Promise<void>;

  protected generateRequestId(): number {
    return ++this.requestId;
  }

  async request(method: string, params?: any): Promise<any> {
    const id = this.generateRequestId();
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params,
      id,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      this.send(request).catch((error) => {
        this.pendingRequests.delete(id);
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout for method: ${method}`));
        }
      }, 30000);
    });
  }

  async notify(method: string, params?: any): Promise<void> {
    const notification: JsonRpcNotification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    await this.send(notification);
  }

  protected handleResponse(response: JsonRpcResponse): void {
    if (response.id !== null && response.id !== undefined) {
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        this.pendingRequests.delete(response.id);
        if (response.error) {
          pending.reject(response.error);
        } else {
          pending.resolve(response.result);
        }
      }
    }
  }

  protected handleNotification(notification: JsonRpcNotification): void {
    this.emit("notification", notification);
  }
}
