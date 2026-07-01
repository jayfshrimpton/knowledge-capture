# Commonplace MCP Server

An MCP (Model Context Protocol) server that lets AI agents like Claude interact with your [Commonplace](https://commonplace-api.onrender.com) knowledge base.

## Tools

| Tool | Description |
|---|---|
| `list_documents` | List all documents visible to you |
| `get_document` | Fetch a document's full content by ID |
| `search_documents` | Semantic search across the knowledge base |
| `create_document` | Create a new document (AI-structured via Gemini) |

## Prerequisites

- Node.js 18 or later
- A Commonplace account with a valid JWT token (see below)

## Getting Your API Key

Your API key is the JWT session token from your Commonplace account. You can find it in your browser's local storage after logging in, or via your account settings. Tokens expire — update your config when you get a new one.

## Setup

```bash
cd mcp
npm install
npm run build
```

## Claude Desktop Integration

Add this to your Claude Desktop config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Production (compiled)

```json
{
  "mcpServers": {
    "commonplace": {
      "command": "node",
      "args": ["/absolute/path/to/mcp/dist/index.js"],
      "env": {
        "COMMONPLACE_API_KEY": "your-jwt-token-here",
        "COMMONPLACE_API_URL": "https://commonplace-api.onrender.com"
      }
    }
  }
}
```

### Development (no build step)

```json
{
  "mcpServers": {
    "commonplace": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/mcp/src/index.ts"],
      "env": {
        "COMMONPLACE_API_KEY": "your-jwt-token-here",
        "COMMONPLACE_API_URL": "https://commonplace-api.onrender.com"
      }
    }
  }
}
```

Replace `/absolute/path/to/mcp` with the actual path on your machine. `COMMONPLACE_API_URL` is optional and defaults to `https://commonplace-api.onrender.com`.

After editing the config, restart Claude Desktop. You should see "commonplace" in the MCP servers list.

## Notes

- **`create_document`** runs your content through Gemini AI structuring and deducts AI credits from your organisation's monthly allowance. The content must be at least 20 words.
- The server scopes all operations to your organisation based on the JWT token provided.
- Tokens expire — update `COMMONPLACE_API_KEY` in your Claude Desktop config when you log in again.
