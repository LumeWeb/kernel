import { CID } from "@lumeweb/libs5";
import { defer } from "@lumeweb/libkernel/module";

type WorkerMessage = (this: Worker, ev: MessageEvent) => any;
type WorkerError = (this: Worker, ev: ErrorEvent) => any;

export default class Worker {
  private _code: Uint8Array;
  private _errorHandler?: WorkerError;
  private _messageHandler?: WorkerMessage;
  private _iframe: HTMLIFrameElement;
  private _iframeDefer = defer();
  private _cid: CID;

  constructor(code: Uint8Array, cid: CID) {
    this._code = code;
    this._cid = cid;

    const iframe = document.createElement("iframe");
    iframe.src = this.getModuleUrl();
    iframe.onload = () => {
      this._postMessage({
        method: "workerInit",
        module: this._code,
      });
    };

    this._iframe = iframe;

    document.body.appendChild(iframe);

    window.addEventListener("message", (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) {
        return;
      }

      if (event.data.method === "workerMessage") {
        this._messageHandler?.(
          new MessageEvent("worker", { data: event.data.data }),
        );
        return;
      }

      if (event.data.method === "workerError") {
        this._errorHandler?.(
          new ErrorEvent("worker", {
            message: event.data.data.message,
            error: event.data.data.error,
          }),
        );
        return;
      }

      if (event.data.method === "workerInited") {
        this._iframeDefer.resolve();
        return;
      }
    });
  }

  set onmessage(handler: (this: Worker, ev: MessageEvent) => any) {
    this._messageHandler = handler;
  }

  set onerror(handler: (this: Worker, ev: ErrorEvent) => any) {
    this._errorHandler = handler;
  }

  get ready(): Promise<any> {
    return this._iframeDefer.promise;
  }

  postMessage(message: any) {
    this._iframeDefer.promise.then(() => {
      this._postMessage(message);
    });
  }

  _postMessage(message: any) {
    this._iframe.contentWindow!.postMessage(message, this.getModuleUrl());
  }

  private getModuleUrl() {
    return `https://${this._cid.toBase32()}.module.kernel.lumeweb.com`;
  }
}
