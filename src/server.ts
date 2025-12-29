import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import z from "zod";
import packageJson from "../package.json";
import { getPageContent } from "./client/helpers";
import {
  createPage,
  listDocs,
  listPages,
  listRows,
  resolveBrowserLink,
  updatePage,
  updateRow,
  upsertRows,
} from "./client/sdk.gen";

export const server = new McpServer({
  name: "coda",
  version: packageJson.version,
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "coda_list_documents",
  "List or search available documents",
  {
    query: z.string().optional().describe("The query to search for documents by - optional"),
  },
  async ({ query }): Promise<CallToolResult> => {
    try {
      const resp = await listDocs({ query: { query }, throwOnError: true });

      return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to list documents: ${error}` }], isError: true };
    }
  },
);

server.tool(
  "coda_list_pages",
  "List pages in the current document with pagination",
  {
    docId: z.string().describe("The ID of the document to list pages from"),
    limit: z.number().int().positive().optional().describe("The number of pages to return - optional, defaults to 25"),
    nextPageToken: z
      .string()
      .optional()
      .describe(
        "The token need to get the next page of results, returned from a previous call to this tool - optional",
      ),
  },
  async ({ docId, limit, nextPageToken }): Promise<CallToolResult> => {
    try {
      const listLimit = nextPageToken ? undefined : limit;

      const resp = await listPages({
        path: { docId },
        query: { limit: listLimit, pageToken: nextPageToken ?? undefined },
        throwOnError: true,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(resp.data) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Failed to list pages: ${error}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  "coda_create_page",
  "Create a page in the current document",
  {
    docId: z.string().describe("The ID of the document to create the page in"),
    name: z.string().describe("The name of the page to create"),
    content: z.string().optional().describe("The markdown content of the page to create - optional"),
    parentPageId: z.string().optional().describe("The ID of the parent page to create this page under - optional"),
  },
  async ({ docId, name, content, parentPageId }): Promise<CallToolResult> => {
    try {
      const resp = await createPage({
        path: { docId },
        body: {
          name,
          parentPageId: parentPageId ?? undefined,
          pageContent: {
            type: "canvas",
            canvasContent: { format: "markdown", content: content ?? " " },
          },
        },
        throwOnError: true,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(resp.data) }],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to create page: ${error}` }], isError: true };
    }
  },
);

server.tool(
  "coda_get_page_content",
  "Get the content of a page as markdown",
  {
    docId: z.string().describe("The ID of the document that contains the page to get the content of"),
    pageIdOrName: z.string().describe("The ID or name of the page to get the content of"),
  },
  async ({ docId, pageIdOrName }): Promise<CallToolResult> => {
    try {
      const content = await getPageContent(docId, pageIdOrName);

      if (content === undefined) {
        throw new Error("Unknown error has occurred");
      }

      return { content: [{ type: "text", text: content }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to get page content: ${error}` }], isError: true };
    }
  },
);

server.tool(
  "coda_peek_page",
  "Peek into the beginning of a page and return a limited number of lines",
  {
    docId: z.string().describe("The ID of the document that contains the page to peek into"),
    pageIdOrName: z.string().describe("The ID or name of the page to peek into"),
    numLines: z
      .number()
      .int()
      .positive()
      .describe("The number of lines to return from the start of the page - usually 30 lines is enough"),
  },
  async ({ docId, pageIdOrName, numLines }): Promise<CallToolResult> => {
    try {
      const content = await getPageContent(docId, pageIdOrName);

      if (!content) {
        throw new Error("Unknown error has occurred");
      }

      const preview = content.split(/\r?\n/).slice(0, numLines).join("\n");

      return { content: [{ type: "text", text: preview }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Failed to peek page: ${error}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  "coda_replace_page_content",
  "Replace the content of a page with new markdown content",
  {
    docId: z.string().describe("The ID of the document that contains the page to replace the content of"),
    pageIdOrName: z.string().describe("The ID or name of the page to replace the content of"),
    content: z.string().describe("The markdown content to replace the page with"),
  },
  async ({ docId, pageIdOrName, content }): Promise<CallToolResult> => {
    try {
      const resp = await updatePage({
        path: {
          docId,
          pageIdOrName,
        },
        body: {
          // @ts-expect-error auto-generated client types
          contentUpdate: {
            insertionMode: "replace",
            canvasContent: { format: "markdown", content },
          },
        },
        throwOnError: true,
      });

      return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to replace page content: ${error}` }], isError: true };
    }
  },
);

server.tool(
  "coda_append_page_content",
  "Append new markdown content to the end of a page",
  {
    docId: z.string().describe("The ID of the document that contains the page to append the content to"),
    pageIdOrName: z.string().describe("The ID or name of the page to append the content to"),
    content: z.string().describe("The markdown content to append to the page"),
  },
  async ({ docId, pageIdOrName, content }): Promise<CallToolResult> => {
    try {
      const resp = await updatePage({
        path: {
          docId,
          pageIdOrName,
        },
        body: {
          // @ts-expect-error auto-generated client types
          contentUpdate: {
            insertionMode: "append",
            canvasContent: { format: "markdown", content },
          },
        },
        throwOnError: true,
      });

      return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to append page content: ${error}` }], isError: true };
    }
  },
);

server.tool(
  "coda_duplicate_page",
  "Duplicate a page in the current document",
  {
    docId: z.string().describe("The ID of the document that contains the page to duplicate"),
    pageIdOrName: z.string().describe("The ID or name of the page to duplicate"),
    newName: z.string().describe("The name of the new page"),
  },
  async ({ docId, pageIdOrName, newName }): Promise<CallToolResult> => {
    try {
      const pageContent = await getPageContent(docId, pageIdOrName);
      const createResp = await createPage({
        path: { docId },
        body: {
          name: newName,
          pageContent: { type: "canvas", canvasContent: { format: "markdown", content: pageContent } },
        },
        throwOnError: true,
      });

      return { content: [{ type: "text", text: JSON.stringify(createResp.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to duplicate page: ${error}` }], isError: true };
    }
  },
);

server.tool(
  "coda_rename_page",
  "Rename a page in the current document",
  {
    docId: z.string().describe("The ID of the document that contains the page to rename"),
    pageIdOrName: z.string().describe("The ID or name of the page to rename"),
    newName: z.string().describe("The new name of the page"),
  },
  async ({ docId, pageIdOrName, newName }): Promise<CallToolResult> => {
    try {
      const resp = await updatePage({
        path: { docId, pageIdOrName },
        body: {
          name: newName,
        },
        throwOnError: true,
      });

      return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to rename page: ${error}` }], isError: true };
    }
  },
);

server.tool(
  "coda_resolve_link",
  "Resolve metadata given a browser link to a Coda object",
  {
    url: z.string().describe("The URL to resolve"),
  },
  async ({ url }): Promise<CallToolResult> => {
    try {
      const resp = await resolveBrowserLink({
        query: { url },
        throwOnError: true,
      });

      return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to resolve link: ${error}` }], isError: true };
    }
  },
);

server.tool(
  "coda_list_rows",
  "List rows from a table with optional filtering, sorting, and pagination",
  {
    docId: z.string().describe("The ID of the document"),
    tableIdOrName: z.string().describe("The ID or name of the table"),
    query: z.string().optional().describe("Filter query in format <column>:<value> - optional"),
    sortBy: z.enum(["createdAt", "natural", "updatedAt"]).optional().describe("Sort order of rows - optional"),
    valueFormat: z
      .enum(["simple", "simpleWithArrays", "rich"])
      .optional()
      .describe("Format for cell values - optional, defaults to simple"),
    visibleOnly: z.boolean().optional().describe("Only return visible rows - optional"),
    limit: z.number().int().positive().optional().describe("Maximum number of rows to return - optional"),
    pageToken: z.string().optional().describe("Token for pagination - optional"),
  },
  async ({ docId, tableIdOrName, query, sortBy, valueFormat, visibleOnly, limit, pageToken }): Promise<
    CallToolResult
  > => {
    try {
      const resp = await listRows({
        path: { docId, tableIdOrName },
        query: {
          query,
          sortBy,
          valueFormat,
          visibleOnly,
          limit,
          pageToken,
        },
        throwOnError: true,
      });

      return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to list rows: ${error}` }], isError: true };
    }
  },
);

server.tool(
  "coda_update_row",
  "Update cells in a table row",
  {
    docId: z.string().describe("The ID of the document"),
    tableIdOrName: z.string().describe("The ID or name of the table"),
    rowIdOrName: z.string().describe("The ID or name of the row to update"),
    cells: z
      .array(
        z.object({
          column: z.string().describe("Column ID or name"),
          value: z
            .union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number(), z.boolean()]))])
            .describe("Cell value"),
        }),
      )
      .describe("Array of cells to update"),
    disableParsing: z.boolean().optional().describe("Disable automatic data parsing - optional"),
  },
  async ({ docId, tableIdOrName, rowIdOrName, cells, disableParsing }): Promise<CallToolResult> => {
    try {
      const resp = await updateRow({
        path: { docId, tableIdOrName, rowIdOrName },
        body: {
          row: { cells },
        },
        query: { disableParsing },
        throwOnError: true,
      });

      return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to update row: ${error}` }], isError: true };
    }
  },
);

server.tool(
  "coda_upsert_rows",
  "Insert new rows into a table, or update existing rows if key columns are provided. Use this to add data to tables.",
  {
    docId: z.string().describe("The ID of the document"),
    tableIdOrName: z.string().describe("The ID or name of the table"),
    rows: z
      .array(
        z.object({
          cells: z
            .array(
              z.object({
                column: z.string().describe("Column ID or name"),
                value: z
                  .union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number(), z.boolean()]))])
                  .describe("Cell value"),
              }),
            )
            .describe("Array of cells for this row"),
        }),
      )
      .describe("Array of rows to insert/upsert"),
    keyColumns: z
      .array(z.string())
      .optional()
      .describe(
        "Optional column IDs or names to use as upsert keys. If provided, rows matching these columns will be updated instead of inserted.",
      ),
    disableParsing: z.boolean().optional().describe("Disable automatic data parsing - optional"),
  },
  async ({ docId, tableIdOrName, rows, keyColumns, disableParsing }): Promise<CallToolResult> => {
    try {
      const resp = await upsertRows({
        path: { docId, tableIdOrName },
        body: {
          rows,
          keyColumns,
        },
        query: { disableParsing },
        throwOnError: true,
      });

      return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to upsert rows: ${error}` }], isError: true };
    }
  },
);
