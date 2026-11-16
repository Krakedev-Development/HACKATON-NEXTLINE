import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SecretsCryptoService } from '../common/secrets-crypto.service';

const DEFAULT_ASSIGNMENT_SECURITY_KEY = 'NX-7k9P#mQ4vL2$xR8';

export interface IntegrationStatusDto {
  hasWhatsappToken: boolean;
  hasGeminiKey: boolean;
  whatsappPhoneNumberId: string | null;
  hasWhatsappBusinessAccountId: boolean;
}

export interface UpdateIntegrationsDto {
  whatsappAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappBusinessAccountId?: string;
  geminiApiKey?: string;
}

export interface LeadAssignmentAgentsDto {
  agentIds: string[];
}

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: SecretsCryptoService,
  ) {}

  async getStatus(organizationId: string): Promise<IntegrationStatusDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { credentials: true },
    });
    if (!org) throw new NotFoundException('Empresa no encontrada');
    const c = org.credentials;
    return {
      hasWhatsappToken: !!(c?.whatsappAccessTokenEnc && c.whatsappAccessTokenEnc.length > 0),
      hasGeminiKey: !!(c?.geminiApiKeyEnc && c.geminiApiKeyEnc.length > 0),
      whatsappPhoneNumberId: org.whatsappPhoneNumberId,
      hasWhatsappBusinessAccountId: !!(c?.whatsappBusinessAccountIdEnc && c.whatsappBusinessAccountIdEnc.length > 0),
    };
  }

  async update(organizationId: string, dto: UpdateIntegrationsDto): Promise<IntegrationStatusDto> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Empresa no encontrada');

    const dataOrg: { whatsappPhoneNumberId?: string | null } = {};
    if (dto.whatsappPhoneNumberId !== undefined) {
      dataOrg.whatsappPhoneNumberId = dto.whatsappPhoneNumberId.trim() || null;
    }
    if (Object.keys(dataOrg).length) {
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: dataOrg,
      });
    }

    const credUpsert: {
      whatsappAccessTokenEnc?: string;
      whatsappBusinessAccountIdEnc?: string;
      geminiApiKeyEnc?: string;
    } = {};

    if (dto.whatsappAccessToken !== undefined && dto.whatsappAccessToken.trim()) {
      credUpsert.whatsappAccessTokenEnc = this.crypto.encrypt(dto.whatsappAccessToken.trim());
    }
    if (dto.whatsappBusinessAccountId !== undefined && dto.whatsappBusinessAccountId.trim()) {
      credUpsert.whatsappBusinessAccountIdEnc = this.crypto.encrypt(
        dto.whatsappBusinessAccountId.trim(),
      );
    }
    if (dto.geminiApiKey !== undefined && dto.geminiApiKey.trim()) {
      credUpsert.geminiApiKeyEnc = this.crypto.encrypt(dto.geminiApiKey.trim());
    }

    if (Object.keys(credUpsert).length) {
      await this.prisma.organizationCredentials.upsert({
        where: { organizationId },
        create: {
          organizationId,
          ...credUpsert,
        },
        update: credUpsert,
      });
    }

    return this.getStatus(organizationId);
  }

  private async getSetting(organizationId: string, key: string): Promise<string | null> {
    const row = await this.prisma.organizationSetting.findUnique({
      where: { organizationId_key: { organizationId, key } },
    });
    return row?.value ?? null;
  }

  private async setSetting(organizationId: string, key: string, value: string): Promise<void> {
    await this.prisma.organizationSetting.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, value },
      update: { value },
    });
  }

  async getLeadAssignmentEnabled(organizationId: string): Promise<boolean> {
    const val = await this.getSetting(organizationId, 'lead_assignment_enabled');
    return val !== 'false';
  }

  async updateLeadAssignmentEnabled(organizationId: string, enabled: boolean): Promise<void> {
    await this.setSetting(organizationId, 'lead_assignment_enabled', enabled ? 'true' : 'false');
  }

  async getLeadAssignmentAgents(organizationId: string): Promise<string[]> {
    const raw = await this.getSetting(organizationId, 'lead_assignment_agents');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((id): id is string => typeof id === 'string');
      return [];
    } catch {
      return [];
    }
  }

  async updateLeadAssignmentAgents(organizationId: string, agentIds: string[]): Promise<void> {
    await this.setSetting(organizationId, 'lead_assignment_agents', JSON.stringify(agentIds));
  }

  async getFidelRoutingSpecialists(
    organizationId: string,
  ): Promise<{ awsAgentId: string | null; softwareAgentId: string | null }> {
    const awsAgentId = (await this.getSetting(organizationId, 'fidel_routing_aws_agent_id')) || null;
    const softwareAgentId =
      (await this.getSetting(organizationId, 'fidel_routing_software_agent_id')) || null;
    return {
      awsAgentId: awsAgentId?.trim() || null,
      softwareAgentId: softwareAgentId?.trim() || null,
    };
  }

  async updateFidelRoutingSpecialists(
    organizationId: string,
    data: { awsAgentId?: string | null; softwareAgentId?: string | null },
  ): Promise<void> {
    if (data.awsAgentId !== undefined) {
      await this.setSetting(
        organizationId,
        'fidel_routing_aws_agent_id',
        data.awsAgentId ? data.awsAgentId.trim() : '',
      );
    }
    if (data.softwareAgentId !== undefined) {
      await this.setSetting(
        organizationId,
        'fidel_routing_software_agent_id',
        data.softwareAgentId ? data.softwareAgentId.trim() : '',
      );
    }
  }

  verifyAssignmentSecurityKey(providedKey?: string): void {
    const expectedKey = (
      process.env.ASSIGNMENT_SECURITY_KEY || DEFAULT_ASSIGNMENT_SECURITY_KEY
    ).trim();
    const cleanProvided = (providedKey || '').trim();
    if (!cleanProvided || cleanProvided !== expectedKey) {
      throw new ForbiddenException(
        'Clave de autorización incorrecta. No tienes permiso para modificar las asignaciones.',
      );
    }
  }
}
