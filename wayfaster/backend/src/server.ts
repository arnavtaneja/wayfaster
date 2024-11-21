import express, { Request, Response } from "express";
import expressWs from "express-ws";
import { RawData, WebSocket } from "ws";
import { createServer, Server as HTTPServer } from "http";
import cors from "cors";
import { Retell } from "retell-sdk";
import { CustomLlmRequest, CustomLlmResponse } from "./types";
import { FunctionCallingLlmClient } from "./llms/llm_openai_func_call";

export class Server {
  private httpServer: HTTPServer;
  public app: expressWs.Application;

  constructor() {
    this.app = expressWs(express()).app;
    this.httpServer = createServer(this.app);
    this.app.use(express.json());
    this.app.use(cors());
    this.app.use(express.urlencoded({ extended: true }));

    this.setupRoutes();
    this.handleRetellLlmWebSocket();
    this.handleWebhook();
  }

  private setupRoutes() {
    // New endpoint for creating web call
    this.app.post('/create-web-call', async (req: Request, res: Response) => {
      try {
        const { agent_id, systemPrompt } = req.body;

        console.log(agent_id, systemPrompt)
        
        const response = await fetch('https://api.retellai.com/v2/create-web-call', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agent_id: agent_id,
                retell_llm_dynamic_variables: { 
                    custom_task: systemPrompt
                }
            })
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error creating web call:', error);
        res.status(500).json({ error: 'Failed to create web call' });
    }
    });
  }

  listen(port: number): void {
    this.app.listen(port);
    console.log("Listening on " + port);
  }

  handleWebhook() {
    this.app.post("/webhook", (req: Request, res: Response) => {
      if (
        !Retell.verify(
          JSON.stringify(req.body),
          process.env.RETELL_API_KEY,
          req.headers["x-retell-signature"] as string,
        )
      ) {
        console.error("Invalid signature");
        return;
      }
      const content = req.body;
      switch (content.event) {
        case "call_started":
          console.log("Call started event received", content.data.call_id);
          break;
        case "call_ended":
          console.log("Call ended event received", content.data.call_id);
          break;
        case "call_analyzed":
          console.log("Call analyzed event received", content.data.call_id);
          break;
        default:
          console.log("Received an unknown event:", content.event);
      }
      res.json({ received: true });
    });
  }

  handleRetellLlmWebSocket() {
    this.app.ws(
      "/llm-websocket/:call_id",
      async (ws: WebSocket, req: Request) => {
        try {
          const callId = req.params.call_id;
          console.log("Handle llm ws for: ", callId);

          const config: CustomLlmResponse = {
            response_type: "config",
            config: {
              auto_reconnect: true,
              call_details: true,
            },
          };
          ws.send(JSON.stringify(config));

          const llmClient = new FunctionCallingLlmClient();

          ws.on("error", (err) => {
            console.error("Error received in LLM websocket client: ", err);
          });
          ws.on("close", (err) => {
            console.error("Closing llm ws for: ", callId);
          });

          ws.on("message", async (data: RawData, isBinary: boolean) => {
            if (isBinary) {
              console.error("Got binary message instead of text in websocket.");
              ws.close(1007, "Cannot find corresponding Retell LLM.");
            }
            const request: CustomLlmRequest = JSON.parse(data.toString());

            if (request.interaction_type === "call_details") {
              console.log("call details: ", request.call);
              llmClient.BeginMessage(ws);
            } else if (
              request.interaction_type === "reminder_required" ||
              request.interaction_type === "response_required"
            ) {
              console.clear();
              console.log("req", request);
              llmClient.DraftResponse(request, ws);
            } else if (request.interaction_type === "ping_pong") {
              let pingpongResponse: CustomLlmResponse = {
                response_type: "ping_pong",
                timestamp: request.timestamp,
              };
              ws.send(JSON.stringify(pingpongResponse));
            } else if (request.interaction_type === "update_only") {
              // process live transcript update if needed
            }
          });
        } catch (err) {
          console.error("Encountered error:", err);
          ws.close(1011, "Encountered error: " + err);
        }
      },
    );
  }
}