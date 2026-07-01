import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const API_KEY = process.env.COMMONPLACE_API_KEY;
const API_URL = process.env.COMMONPLACE_API_URL ?? 'https://commonplace-api.onrender.com';

if (!API_KEY) {
  process.stderr.write('Error: COMMONPLACE_API_KEY environment variable is required\n');
  process.exit(1);
}

async function apiRequest(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
): Promise<unknown> {
  const url = `${API_URL}${path}`;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);

  if (!res.ok) {
    let detail = '';
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) detail = `: ${err.error}`;
    } catch {
      // ignore parse failure — use status only
    }
    throw new Error(`API error ${res.status}${detail}`);
  }

  return res.json();
}

const TOOLS = [
  {
    name: 'list_documents',
    description:
      'List all documents in the Commonplace knowledge base visible to the authenticated user. Returns id, title, author, format, summary, tags, status, and timestamps.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_document',
    description:
      'Fetch a single Commonplace document by its ID. Returns the full document including structured content sections and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The UUID of the document to retrieve.',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'search_documents',
    description:
      'Semantically search the Commonplace knowledge base using vector similarity. Returns ranked results with a similarity score (0–1).',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query string.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (1–20, default 10).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_document',
    description:
      'Create a new document in the Commonplace knowledge base. The content is structured by Gemini AI and deducts AI credits from the organisation. Requires at least 20 words in the content field.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The document title.',
        },
        content: {
          type: 'string',
          description: 'The raw text content to be structured (minimum 20 words).',
        },
        author: {
          type: 'string',
          description: 'Optional author name. Defaults to Unknown if omitted.',
        },
      },
      required: ['title', 'content'],
    },
  },
];

const server = new Server(
  { name: 'commonplace', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  try {
    let result: unknown;

    switch (name) {
      case 'list_documents':
        result = await apiRequest('GET', '/api/documents');
        break;

      case 'get_document': {
        const id = a['id'];
        if (typeof id !== 'string' || !id) {
          throw new Error('id is required and must be a non-empty string');
        }
        result = await apiRequest('GET', `/api/documents/${encodeURIComponent(id)}`);
        break;
      }

      case 'search_documents': {
        const query = a['query'];
        if (typeof query !== 'string' || !query.trim()) {
          throw new Error('query is required and must be a non-empty string');
        }
        const body: Record<string, unknown> = { query };
        if (typeof a['limit'] === 'number') {
          body['limit'] = a['limit'];
        }
        result = await apiRequest('POST', '/api/search', body);
        break;
      }

      case 'create_document': {
        const title = a['title'];
        const content = a['content'];
        if (typeof title !== 'string' || !title.trim()) {
          throw new Error('title is required and must be a non-empty string');
        }
        if (typeof content !== 'string' || !content.trim()) {
          throw new Error('content is required and must be a non-empty string');
        }
        const body: Record<string, unknown> = {
          title: title.trim(),
          rawText: content,
        };
        if (typeof a['author'] === 'string' && a['author'].trim()) {
          body['author'] = a['author'].trim();
        }
        result = await apiRequest('POST', '/api/capture', body);
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
