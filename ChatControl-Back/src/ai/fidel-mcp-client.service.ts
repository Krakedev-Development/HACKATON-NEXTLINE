import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FidelMcpExtractedField {
  key: string;
  value: string;
  status: 'captured' | 'partial' | 'missing';
}

export interface FidelMcpToolExecution {
  toolName: string;
  success: boolean;
  timestamp: string;
  data: Record<string, unknown>;
  message: string;
}

export interface FidelMcpTurnResult {
  sessionId: string;
  tenantSlug: string;
  tenantName: string;
  status: 'AI_ACTIVE' | 'HUMAN_ACTIVE' | 'CLOSED';
  ignoredByAi?: boolean;
  replyText: string | null;
  detectedProductKey: 'ia_docencia' | 'aws_pack' | 'krake_mentor' | 'custom_software' | string;
  previousProductKey?: string;
  productSwitched?: boolean;
  intentLevel: 'ALTO' | 'MEDIO' | 'BAJO' | string;
  intentJustification?: string;
  extractedFields: FidelMcpExtractedField[];
  nextAction?: string;
  incrementalSummary?: string;
  summaryUpdated?: boolean;
  mcpExecutions: FidelMcpToolExecution[];
  notice?: string;
  trainingMode?: 'SETUP' | 'ROLEPLAY' | 'CORRECTION' | string;
  learnedRule?: any;
  handoffRequested?: boolean;
  handoffCategory?: 'SUPPORT_OR_FRICTION' | 'SALES_REQUEST' | string | null;
  withinBusinessHours?: boolean;
}

@Injectable()
export class FidelMcpClientService {
  private readonly logger = new Logger(FidelMcpClientService.name);
  private readonly mcpUrl: string;
  private readonly tenantKey: string;

  constructor(private readonly config: ConfigService) {
    this.mcpUrl = (
      this.config.get<string>('FIDEL_MCP_URL') ||
      'https://fidelback-mcp.onrender.com/api'
    ).replace(/\/$/, '');
    this.tenantKey =
      this.config.get<string>('FIDEL_MCP_TENANT_KEY') || 'fidel_live_clearminds_2026';

    this.logger.log(`🔌 FidelMcpClientService inicializado conectando a: ${this.mcpUrl}`);
  }

  async sendTurn(params: {
    conversationId: string;
    message: string;
    senderRole?: 'user' | 'human_agent';
    trainingMode?: boolean;
    trainerName?: string;
    adContext?: {
      sourceId?: string;
      headline?: string;
      body?: string;
      welcomeText?: string;
      imageUrl?: string;
      campaignName?: string;
    };
  }): Promise<FidelMcpTurnResult> {
    const endpoint = `${this.mcpUrl}/chat/send`;
    const maxAttempts = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-key': this.tenantKey,
          },
          body: JSON.stringify({
            sessionId: params.conversationId,
            message: params.message,
            senderRole: params.senderRole || 'user',
            trainingMode: params.trainingMode ?? false,
            trainerName: params.trainerName,
            adContext: params.adContext,
          }),
          signal: AbortSignal.timeout(25_000),
        });

        if (!response.ok) {
          const errorText = await response.text();
          const isTransient = [429, 502, 503, 504].includes(response.status);
          if (isTransient && attempt < maxAttempts) {
            this.logger.warn(
              `Fidel MCP HTTP ${response.status} (intento ${attempt}/${maxAttempts}). Reintentando en 3s...`,
            );
            await new Promise((r) => setTimeout(r, 3000));
            continue;
          }
          this.logger.error(
            `Error en respuesta de Fidel MCP (${response.status}): ${errorText}`,
          );
          throw new Error(`Fidel MCP respondió con status ${response.status}: ${errorText}`);
        }

        const data = (await response.json()) as FidelMcpTurnResult;
        return data;
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        const isClientHttpError = msg.startsWith('Fidel MCP respondió con status 4') && !msg.includes('429');
        if (!isClientHttpError && attempt < maxAttempts) {
          this.logger.warn(
            `Fallo temporal con Fidel MCP (intento ${attempt}/${maxAttempts}): ${msg}. Reintentando en 3s...`,
          );
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        this.logger.error(
          `Fallo al comunicarse con Fidel MCP en ${endpoint}: ${msg}`,
        );
        throw err;
      }
    }

    throw lastError;
  }

  async setSessionStatus(
    conversationId: string,
    status: 'AI_ACTIVE' | 'HUMAN_ACTIVE',
  ): Promise<void> {
    const endpoint = `${this.mcpUrl}/chat/sessions/${conversationId}/status`;
    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-key': this.tenantKey,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        this.logger.warn(`No se pudo sincronizar status en Fidel MCP (${response.status})`);
      }
    } catch (err: any) {
      this.logger.warn(`Error sincronizando status en Fidel MCP: ${err?.message || err}`);
    }
  }

  async getSessionState(conversationId: string): Promise<any> {
    const endpoint = `${this.mcpUrl}/chat/sessions/${conversationId}`;
    try {
      const response = await fetch(endpoint, {
        headers: {
          'x-tenant-key': this.tenantKey,
        },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Ignorar
    }
    return null;
  }

  async listTrainingRules(): Promise<any[]> {
    const endpoint = `${this.mcpUrl}/chat/rules`;
    const response = await fetch(endpoint, {
      headers: { 'x-tenant-key': this.tenantKey },
    });
    if (!response.ok) {
      throw new Error(`Error listando reglas en Fidel MCP (${response.status})`);
    }
    const data = (await response.json()) as { rules?: any[] };
    return data.rules || [];
  }

  async createTrainingRule(body: {
    instruction: string;
    category?: string;
    sourceFeedback?: string;
    createdByName?: string;
  }): Promise<any> {
    const endpoint = `${this.mcpUrl}/chat/rules`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-key': this.tenantKey,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Error creando regla en Fidel MCP (${response.status})`);
    }
    const data = (await response.json()) as { rule?: any };
    return data.rule;
  }

  async toggleTrainingRule(ruleId: string, isActive: boolean): Promise<any[]> {
    const endpoint = `${this.mcpUrl}/chat/rules/${ruleId}`;
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-key': this.tenantKey,
      },
      body: JSON.stringify({ isActive }),
    });
    if (!response.ok) {
      throw new Error(`Error actualizando regla en Fidel MCP (${response.status})`);
    }
    const data = (await response.json()) as { rules?: any[] };
    return data.rules || [];
  }

  async deleteTrainingRule(ruleId: string): Promise<any[]> {
    const endpoint = `${this.mcpUrl}/chat/rules/${ruleId}`;
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'x-tenant-key': this.tenantKey },
    });
    if (!response.ok) {
      throw new Error(`Error eliminando regla en Fidel MCP (${response.status})`);
    }
    const data = (await response.json()) as { rules?: any[] };
    return data.rules || [];
  }

  async runSandboxTrainingTurn(body: {
    message: string;
    history?: Array<{ role: 'trainer' | 'fidel'; text: string }>;
    trainerName?: string;
  }): Promise<{ ok: boolean; text: string; mode: string; learnedRule: any }> {
    const endpoint = `${this.mcpUrl}/chat/training-turn`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-key': this.tenantKey,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error en entrenamiento sandbox Fidel MCP (${response.status}): ${errText}`);
    }
    return (await response.json()) as { ok: boolean; text: string; mode: string; learnedRule: any };
  }
}
