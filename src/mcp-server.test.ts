import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { join } from 'path';

function runMcp(inputLines: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [join(process.cwd(), 'dist', 'mcp-server.js')], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', reject);
    // Write lines
    for (const line of inputLines) {
      proc.stdin.write(line + '\n');
    }
    setTimeout(() => {
      proc.kill();
      resolve({ stdout, stderr });
    }, 800);
  });
}

describe('MCP Server', () => {
  it('should respond to initialize', async () => {
    const { stdout, stderr } = await runMcp([
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    ]);
    expect(stdout).toContain('protocolVersion');
    expect(stdout).toContain('cyberaudit-skill');
    expect(stderr).toContain('MCP server ready');
    const lines = stdout.trim().split('\n').filter(Boolean);
    const first = JSON.parse(lines[0]);
    expect(first.result.serverInfo.version).toMatch(/\d+\.\d+\.\d+/);
    // Should read version from package.json (3.1.5)
    expect(first.result.serverInfo.version).toBe('3.1.5');
  });

  it('should list 6 tools including cloud', async () => {
    const { stdout } = await runMcp([
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
    ]);
    const lines = stdout.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    const listResp = lines.find(r => r.id === 2);
    expect(listResp).toBeDefined();
    const toolNames = listResp.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('cyberaudit-web');
    expect(toolNames).toContain('cyberaudit-cloud');
    expect(toolNames).toContain('cyberaudit-quick');
    expect(toolNames.length).toBeGreaterThanOrEqual(6);
  });

  it('should handle cloud tool call', async () => {
    const { stdout } = await runMcp([
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'cyberaudit-cloud', arguments: { target: 'terraform/' } },
      }),
    ]);
    const lines = stdout.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    const callResp = lines.find(r => r.id === 2);
    expect(callResp).toBeDefined();
    const text = callResp.result.content[0].text;
    expect(text).toContain('CLOUD');
    expect(text).toContain('terraform/');
    expect(text).toContain('CLOUD-CHECKLIST.md');
  });

  it('should use single source of truth (no duplicate implementation in cli)', async () => {
    // cli.ts should import from mcp-server.js
    const fs = await import('fs');
    const cliContent = fs.readFileSync(join(process.cwd(), 'src', 'cli.ts'), 'utf-8');
    expect(cliContent).toContain('from "./mcp-server.js"');
    expect(cliContent).not.toContain('msg.para'); // old buggy truncation
  });
});
