import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { FidelMcpClientService } from './fidel-mcp-client.service';
import { SettingsModule } from '../settings/settings.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [SettingsModule, PrismaModule],
  providers: [AiService, FidelMcpClientService],
  exports: [AiService, FidelMcpClientService],
})
export class AiModule {}
