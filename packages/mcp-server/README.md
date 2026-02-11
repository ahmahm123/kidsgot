# @humanrent/rentahuman-mcp

MCP server package for HumanRent. It exposes tools to search humans, create bounties, start conversations, send messages, and accept applications.

## Environment Variables

- `RENTAHUMAN_API_KEY` (required): API key generated from HumanRent dashboard.
- `RENTAHUMAN_API_URL` (optional): Base URL for REST API. Defaults to `http://localhost:3000/api/v1`.

## Run

```bash
npx -y @humanrent/rentahuman-mcp
```

## MCP client config snippet

```json
{
  "mcpServers": {
    "rentahuman": {
      "command": "npx",
      "args": ["-y", "@humanrent/rentahuman-mcp"],
      "env": {
        "RENTAHUMAN_API_KEY": "rah_your_api_key_here"
      }
    }
  }
}
```
