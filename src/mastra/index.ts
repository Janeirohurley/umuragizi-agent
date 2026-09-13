
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { initPublicSchema, closePool, mastraStorage } from './config/database';
import { initAmmpSchema } from './config/ammp-schema';
import { Observability, MastraStorageExporter, MastraPlatformExporter, SensitiveDataFilter } from '@mastra/observability';
import { initAdminTables, ensureAdmin } from './auth/admin-auth';
import { TENANT_ID_KEY } from './tools/tool-helpers';

import { weatherAgent } from './agents/weather-agent';
import { umuragiziAgent } from './agents/umuragizi-agent';

import { weatherWorkflow } from './workflows/weather-workflow';
import { healthAnalysisWorkflow } from './workflows/health-analysis-workflow';
import { reproductionPlanningWorkflow } from './workflows/reproduction-planning-workflow';

import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';

import { listAnimalsTool, getAnimalTool, addAnimalTool, updateAnimalTool, deleteAnimalTool } from './tools/animal-tool';
import { listHealthRecordsTool, addHealthRecordTool, getHealthSummaryTool } from './tools/health-tool';
import { listGrowthRecordsTool, addGrowthRecordTool, getGrowthTrendTool } from './tools/growth-tool';
import { listFeedingsTool, addFeedingTool, getFeedingSummaryTool } from './tools/feeding-tool';
import { listReproductionsTool, addReproductionTool, getReproductionCalendarTool } from './tools/reproduction-tool';
import { listProductionsTool, addProductionTool, getProductionSummaryTool } from './tools/production-tool';
import { listTransactionsTool, addTransactionTool, getFinanceSummaryTool } from './tools/finance-tool';
import { listRemindersTool, addReminderTool, completeReminderTool } from './tools/reminder-tool';
import { weatherTool } from './tools/weather-tool-umuragizi';

import {
  handleActivate,
  handleRefresh,
  handleChat,
  handleSyncPush,
  handleSyncPull,
  handleSyncStatus,
  verifyDeviceAuth,
} from './routes/device-routes';
import {
  handleAdminLogin,
  handleAdminLogout,
  handleAdminMe,
  handleAdminStats,
  handleAdminAudit,
  handleAdminTenantsGet,
  handleAdminTenantsPost,
  handleAdminTenantPut,
  handleAdminTenantDelete,
  handleAdminTokensPost,
  handleAdminTokensGet,
  handleAdminTokensRevoke,
  handleAdminTokensDelete,
  handleAdminDevicesGet,
  handleAdminDevicesRevoke,
  handleAdminUsage,
  handleAdminSecurity,
  handleAdminAgents,
  handleAdminServerInfo,
} from './routes/admin-routes';
import {
  handleAmmpProvidersList,
  handleAmmpProviderCreate,
  handleAmmpProviderGet,
  handleAmmpProviderUpdate,
  handleAmmpProviderDelete,
  handleAmmpProviderToggle,
  handleAmmpAccountsList,
  handleAmmpAccountCreate,
  handleAmmpAccountGet,
  handleAmmpAccountUpdate,
  handleAmmpAccountDelete,
  handleAmmpAccountToggle,
  handleAmmpAccountCheck,
  handleAmmpModelsList,
  handleAmmpModelCreate,
  handleAmmpModelGet,
  handleAmmpModelUpdate,
  handleAmmpModelDelete,
  handleAmmpModelToggle,
  handleAmmpPoolsList,
  handleAmmpPoolCreate,
  handleAmmpPoolGet,
  handleAmmpPoolUpdate,
  handleAmmpPoolDelete,
  handleAmmpPoolAddModel,
  handleAmmpPoolRemoveModel,
  handleAmmpPoolToggleModel,
  handleAmmpPoliciesList,
  handleAmmpPolicyCreate,
  handleAmmpPolicyGet,
  handleAmmpPolicyUpdate,
  handleAmmpPolicyDelete,
  handleAmmpPolicyToggle,
  handleAmmpHealthAll,
  handleAmmpHealthProvider,
  handleAmmpHealthTest,
  handleAmmpHealthClearCooldown,
  handleAmmpLogs,
  handleAmmpRoutingStatus,
  handleAmmpRoutingTest,
} from './routes/ammp-routes';

await initPublicSchema();
await initAdminTables();
await initAmmpSchema();

const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
await ensureAdmin(adminUsername, adminPassword);

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errRes(message: string, status = 500) {
  return jsonRes({ error: message }, status);
}

export const mastra = new Mastra({
  agents: { weatherAgent, umuragiziAgent },
  tools: {
    listAnimalsTool, getAnimalTool, addAnimalTool, updateAnimalTool, deleteAnimalTool,
    listHealthRecordsTool, addHealthRecordTool, getHealthSummaryTool,
    listGrowthRecordsTool, addGrowthRecordTool, getGrowthTrendTool,
    listFeedingsTool, addFeedingTool, getFeedingSummaryTool,
    listReproductionsTool, addReproductionTool, getReproductionCalendarTool,
    listProductionsTool, addProductionTool, getProductionSummaryTool,
    listTransactionsTool, addTransactionTool, getFinanceSummaryTool,
    listRemindersTool, addReminderTool, completeReminderTool,
    weatherTool,
  },
  workflows: { weatherWorkflow, healthAnalysisWorkflow, reproductionPlanningWorkflow },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: mastraStorage,
  logger: new PinoLogger({ name: 'Mastra', level: 'info' }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [new MastraStorageExporter(), new MastraPlatformExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
  server: {
    middleware: [
      async (context, next) => {
        const path = context.req.path;
        const normalizedPath = path.replace(/^\/api/, '');

        // === Public routes ===
        if (normalizedPath === '/activate') return handleActivate(context);
        if (normalizedPath === '/auth/refresh') return handleRefresh(context);

        // === Admin routes ===
        if (normalizedPath === '/admin/login') return handleAdminLogin(context);
        if (normalizedPath === '/admin/logout') return handleAdminLogout(context);
        if (normalizedPath === '/admin/me') return handleAdminMe(context);
        if (normalizedPath === '/admin/stats') return handleAdminStats(context);
        if (normalizedPath === '/admin/audit') return handleAdminAudit(context);
        if (normalizedPath === '/admin/usage') return handleAdminUsage(context);
        if (normalizedPath === '/admin/security') return handleAdminSecurity(context);
        if (normalizedPath === '/admin/agents') return handleAdminAgents(context);
        if (normalizedPath === '/admin/server-info') return handleAdminServerInfo(context);

        if (normalizedPath === '/admin/tenants' && context.req.method === 'POST') return handleAdminTenantsPost(context);
        if (normalizedPath === '/admin/tenants' && context.req.method === 'GET') return handleAdminTenantsGet(context);

        const tenantMatch = normalizedPath.match(/^\/admin\/tenants\/([\w-]+)$/);
        if (tenantMatch) {
          if (context.req.method === 'PUT') return handleAdminTenantPut(context, tenantMatch[1]);
          if (context.req.method === 'DELETE') return handleAdminTenantDelete(context, tenantMatch[1]);
        }

        if (normalizedPath === '/admin/tokens' && context.req.method === 'POST') return handleAdminTokensPost(context);

        const tokensMatch = normalizedPath.match(/^\/admin\/tokens\/([\w-]+)$/);
        if (tokensMatch && context.req.method === 'GET') return handleAdminTokensGet(context, tokensMatch[1]);

        if (normalizedPath === '/admin/tokens/revoke' && context.req.method === 'POST') return handleAdminTokensRevoke(context);
        if (normalizedPath === '/admin/tokens/delete' && context.req.method === 'POST') return handleAdminTokensDelete(context);

        const devicesMatch = normalizedPath.match(/^\/admin\/devices\/([\w-]+)$/);
        if (devicesMatch && context.req.method === 'GET') return handleAdminDevicesGet(context, devicesMatch[1]);
        if (normalizedPath === '/admin/devices/revoke' && context.req.method === 'POST') return handleAdminDevicesRevoke(context);

        // === AMMP Provider routes ===
        if (normalizedPath === '/admin/ammp/providers' && context.req.method === 'GET') return handleAmmpProvidersList(context);
        if (normalizedPath === '/admin/ammp/providers' && context.req.method === 'POST') return handleAmmpProviderCreate(context);

        const ammpProviderMatch = normalizedPath.match(/^\/admin\/ammp\/providers\/([\w-]+)$/);
        if (ammpProviderMatch) {
          const id = ammpProviderMatch[1];
          if (context.req.method === 'GET') return handleAmmpProviderGet(context, id);
          if (context.req.method === 'PUT') return handleAmmpProviderUpdate(context, id);
          if (context.req.method === 'DELETE') return handleAmmpProviderDelete(context, id);
        }

        const ammpProviderToggleMatch = normalizedPath.match(/^\/admin\/ammp\/providers\/([\w-]+)\/toggle$/);
        if (ammpProviderToggleMatch && context.req.method === 'POST') return handleAmmpProviderToggle(context, ammpProviderToggleMatch[1]);

        // === AMMP Account routes ===
        const ammpAccountsListMatch = normalizedPath.match(/^\/admin\/ammp\/accounts$/);
        if (ammpAccountsListMatch && context.req.method === 'GET') return handleAmmpAccountsList(context);
        if (normalizedPath === '/admin/ammp/accounts' && context.req.method === 'POST') return handleAmmpAccountCreate(context);

        const ammpProviderAccountsMatch = normalizedPath.match(/^\/admin\/ammp\/providers\/([\w-]+)\/accounts$/);
        if (ammpProviderAccountsMatch && context.req.method === 'GET') return handleAmmpAccountsList(context, ammpProviderAccountsMatch[1]);

        const ammpAccountMatch = normalizedPath.match(/^\/admin\/ammp\/accounts\/([\w-]+)$/);
        if (ammpAccountMatch) {
          const id = ammpAccountMatch[1];
          if (context.req.method === 'GET') return handleAmmpAccountGet(context, id);
          if (context.req.method === 'PUT') return handleAmmpAccountUpdate(context, id);
          if (context.req.method === 'DELETE') return handleAmmpAccountDelete(context, id);
        }

        const ammpAccountToggleMatch = normalizedPath.match(/^\/admin\/ammp\/accounts\/([\w-]+)\/toggle$/);
        if (ammpAccountToggleMatch && context.req.method === 'POST') return handleAmmpAccountToggle(context, ammpAccountToggleMatch[1]);

        const ammpAccountCheckMatch = normalizedPath.match(/^\/admin\/ammp\/accounts\/([\w-]+)\/check$/);
        if (ammpAccountCheckMatch && context.req.method === 'GET') return handleAmmpAccountCheck(context, ammpAccountCheckMatch[1]);

        // === AMMP Model routes ===
        if (normalizedPath === '/admin/ammp/models' && context.req.method === 'GET') return handleAmmpModelsList(context);
        if (normalizedPath === '/admin/ammp/models' && context.req.method === 'POST') return handleAmmpModelCreate(context);

        const ammpModelMatch = normalizedPath.match(/^\/admin\/ammp\/models\/([\w-]+)$/);
        if (ammpModelMatch) {
          const id = ammpModelMatch[1];
          if (context.req.method === 'GET') return handleAmmpModelGet(context, id);
          if (context.req.method === 'PUT') return handleAmmpModelUpdate(context, id);
          if (context.req.method === 'DELETE') return handleAmmpModelDelete(context, id);
        }

        const ammpModelToggleMatch = normalizedPath.match(/^\/admin\/ammp\/models\/([\w-]+)\/toggle$/);
        if (ammpModelToggleMatch && context.req.method === 'POST') return handleAmmpModelToggle(context, ammpModelToggleMatch[1]);

        // === AMMP Pool routes ===
        if (normalizedPath === '/admin/ammp/pools' && context.req.method === 'GET') return handleAmmpPoolsList(context);
        if (normalizedPath === '/admin/ammp/pools' && context.req.method === 'POST') return handleAmmpPoolCreate(context);

        const ammpPoolMatch = normalizedPath.match(/^\/admin\/ammp\/pools\/([\w-]+)$/);
        if (ammpPoolMatch) {
          const id = ammpPoolMatch[1];
          if (context.req.method === 'GET') return handleAmmpPoolGet(context, id);
          if (context.req.method === 'PUT') return handleAmmpPoolUpdate(context, id);
          if (context.req.method === 'DELETE') return handleAmmpPoolDelete(context, id);
        }

        const ammpPoolModelMatch = normalizedPath.match(/^\/admin\/ammp\/pools\/([\w-]+)\/models$/);
        if (ammpPoolModelMatch && context.req.method === 'POST') return handleAmmpPoolAddModel(context, ammpPoolModelMatch[1]);

        const ammpPoolModelRemoveMatch = normalizedPath.match(/^\/admin\/ammp\/pools\/([\w-]+)\/models\/([\w-]+)$/);
        if (ammpPoolModelRemoveMatch) {
          if (context.req.method === 'DELETE') return handleAmmpPoolRemoveModel(context, ammpPoolModelRemoveMatch[1], ammpPoolModelRemoveMatch[2]);
        }

        const ammpPoolModelToggleMatch = normalizedPath.match(/^\/admin\/ammp\/pools\/([\w-]+)\/models\/([\w-]+)\/toggle$/);
        if (ammpPoolModelToggleMatch && context.req.method === 'POST') return handleAmmpPoolToggleModel(context, ammpPoolModelToggleMatch[1], ammpPoolModelToggleMatch[2]);

        // === AMMP Routing Policy routes ===
        if (normalizedPath === '/admin/ammp/policies' && context.req.method === 'GET') return handleAmmpPoliciesList(context);
        if (normalizedPath === '/admin/ammp/policies' && context.req.method === 'POST') return handleAmmpPolicyCreate(context);

        const ammpPolicyMatch = normalizedPath.match(/^\/admin\/ammp\/policies\/([\w-]+)$/);
        if (ammpPolicyMatch) {
          const id = ammpPolicyMatch[1];
          if (context.req.method === 'GET') return handleAmmpPolicyGet(context, id);
          if (context.req.method === 'PUT') return handleAmmpPolicyUpdate(context, id);
          if (context.req.method === 'DELETE') return handleAmmpPolicyDelete(context, id);
        }

        const ammpPolicyToggleMatch = normalizedPath.match(/^\/admin\/ammp\/policies\/([\w-]+)\/toggle$/);
        if (ammpPolicyToggleMatch && context.req.method === 'POST') return handleAmmpPolicyToggle(context, ammpPolicyToggleMatch[1]);

        // === AMMP Health routes ===
        if (normalizedPath === '/admin/ammp/health' && context.req.method === 'GET') return handleAmmpHealthAll(context);
        if (normalizedPath === '/admin/ammp/logs' && context.req.method === 'GET') return handleAmmpLogs(context);
        if (normalizedPath === '/admin/ammp/routing/status' && context.req.method === 'GET') return handleAmmpRoutingStatus(context);
        if (normalizedPath === '/admin/ammp/routing/test' && context.req.method === 'POST') return handleAmmpRoutingTest(context);

        const ammpHealthProviderMatch = normalizedPath.match(/^\/admin\/ammp\/health\/([\w-]+)$/);
        if (ammpHealthProviderMatch && context.req.method === 'GET') return handleAmmpHealthProvider(context, ammpHealthProviderMatch[1]);

        const ammpHealthTestMatch = normalizedPath.match(/^\/admin\/ammp\/health\/([\w-]+)\/test$/);
        if (ammpHealthTestMatch && context.req.method === 'POST') return handleAmmpHealthTest(context, ammpHealthTestMatch[1]);

        const ammpHealthCooldownMatch = normalizedPath.match(/^\/admin\/ammp\/health\/([\w-]+)\/clear-cooldown$/);
        if (ammpHealthCooldownMatch && context.req.method === 'POST') return handleAmmpHealthClearCooldown(context, ammpHealthCooldownMatch[1]);

        if (normalizedPath.startsWith('/admin/')) return errRes('Route admin non trouvée', 404);

        // === Skip auth for internal routes ===
        const publicRoutes = ['/activate', '/auth/refresh', '/__restart-active-workflow-runs', '/__refresh'];
        if (publicRoutes.includes(normalizedPath)) return await next();

        // === Device auth ===
        const auth = await verifyDeviceAuth(context);
        if (!auth.valid) return auth.error!;
        if (auth.tenantId) {
          const requestContext = context.get('requestContext');
          requestContext.set(TENANT_ID_KEY, auth.tenantId);
        }

        // === Chat ===
        if (normalizedPath === '/chat' && context.req.method === 'POST') return handleChat(context);

        // === Sync ===
        if (normalizedPath === '/sync/push' && context.req.method === 'POST') return handleSyncPush(context);
        if (normalizedPath === '/sync/pull' && context.req.method === 'POST') return handleSyncPull(context);
        if (normalizedPath === '/sync/status' && context.req.method === 'GET') return handleSyncStatus(context);

        return await next();
      },
    ],
    apiRoutes: [],
  },
});
