# wayfaster

### To run backend

1. [install ngrok](https://download.ngrok.com/mac-os)
2. run `ngrok http 8000`
3. Copy Production URL into agent's custom LLM URL on retell AI
4. `cd wayfaster/backend`
5. Create a `.env.development` file
6. Add API keys for
   - RETELL_API_KEY
   - OPENAI_APIKEY
   - OPENAI_ORGANIZATION_ID
7. `npm install`
8. `npm run dev`

### To run front end.

1. `cd wayfaster/frontend/frontend_demo`
2. `npm ci`
3. add agent_id in App.tsx
4. `npm run start`