import React, { useEffect, useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";

const AGENT_ID = "agent_9c32c7bb2f92ba731203e8a424";
const API_URL = "http://localhost:8000/create-web-call";

const defaultPrompt = `tell me interesting facts`;

const retellWebClient = new RetellWebClient();

const App = () => {
  const [isCalling, setIsCalling] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(defaultPrompt);
  const [conversationEnded, setConversationEnded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    retellWebClient.on("call_started", () => {
      console.log("Call started");
      setError("");
    });

    retellWebClient.on("call_ended", () => {
      console.log("Call ended");
      setIsCalling(false);
      setConversationEnded(true);
    });

    retellWebClient.on("error", (error) => {
      console.error("Error:", error);
      setError(`Error: ${error.message || "Unknown error occurred"}`);
      retellWebClient.stopCall();
      setIsCalling(false);
    });

    return () => {
      if (isCalling) {
        retellWebClient.stopCall();
      }
    };
  }, [isCalling]);

  const startCall = async () => {
    try {
      setError("");
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          agent_id: AGENT_ID,
          systemPrompt 
        })
      });

      const data = await response.json();
      
      if (!data.access_token) {
        throw new Error("No access token received");
      }

      await retellWebClient.startCall({ accessToken: data.access_token });
      setIsCalling(true);
      setConversationEnded(false);
    } catch (err) {
      console.error("Start call error:", err);
      setError(err.message || "Failed to start call");
      setIsCalling(false);
    }
  };

  const endCall = () => {
    try {
      retellWebClient.stopCall();
      setIsCalling(false);
      setConversationEnded(true);
    } catch (err) {
      console.error("End call error:", err);
      setError(err.message || "Failed to end call");
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '20px auto',
      fontFamily: 'Arial, sans-serif' 
    }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '10px',
          fontWeight: 'bold'
        }}>
          System Prompt:
        </label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Enter system prompt here..."
          style={{ 
            width: '100%', 
            height: '200px', 
            padding: '10px',
            marginBottom: '10px',
            borderRadius: '5px',
            border: '1px solid #ddd'
          }}
        />
      </div>

      {error && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '5px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
        {!isCalling && !conversationEnded && (
          <button 
            onClick={startCall}
            style={{ 
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Start Conversation
          </button>
        )}

        {isCalling && (
          <>
            <div style={{ 
              padding: '12px',
              backgroundColor: '#e8f5e9',
              borderRadius: '5px',
              color: '#2e7d32'
            }}>
              Conversation in Progress
            </div>
            <button 
              onClick={endCall}
              style={{ 
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              End Conversation
            </button>
          </>
        )}

        {conversationEnded && (
          <div style={{ 
            padding: '12px',
            backgroundColor: '#e3f2fd',
            borderRadius: '5px',
            color: '#1565c0'
          }}>
            Conversation Ended
          </div>
        )}
      </div>
    </div>
  );
};

export default App;