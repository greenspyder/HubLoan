using CreditoSimulador.App.Data;
using CreditoSimulador.App.Handlers;
using CreditoSimulador.App.Services;
using Hangfire;
using Hangfire.PostgreSql;
using Hangfire.Storage;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

var frontendOrigin = builder.Configuration["FRONTEND_ORIGIN"];
var port = Environment.GetEnvironmentVariable("PORT");
var connectionString = ConnectionStringResolver.Resolve(builder.Configuration);
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// Adiciona suporte a Controllers (para seu AdminController)
builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddHangfire(configuration =>
{
    configuration.UsePostgreSqlStorage(options =>
        options.UseNpgsqlConnection(connectionString));
});
builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = 2;
});

builder.Services.AddScoped<InMemoryCreditCatalog>();
builder.Services.AddScoped<ListarClientesHandler>();
builder.Services.AddScoped<ListarContratosHandler>();
builder.Services.AddScoped<ListarParcelasHandler>();
builder.Services.AddScoped<ProcessarContratoHandler>();
builder.Services.AddScoped<PagarParcelaHandler>();
builder.Services.AddScoped<SimularCreditoHandler>();
builder.Services.AddScoped<ContratarCreditoHandler>();
builder.Services.AddScoped<ObterDetalhesContratoHandler>();
builder.Services.AddScoped<AtualizarStatusContratoHandler>();
builder.Services.AddScoped<AssinarContratoHandler>();
builder.Services.AddScoped<AutorizarDesembolsoHandler>();
builder.Services.AddScoped<CriarOfertaHandler>();
builder.Services.AddScoped<ListarOfertasHandler>();
builder.Services.AddScoped<ListarSolicitacoesAdminHandler>();
builder.Services.AddScoped<OverdueParcelAutoPaymentJob>();
builder.Services.AddScoped<LoanContractGenerationConsumer>();
builder.Services.AddScoped<ContractDocxService>();

// Adicione ANTES de app.Build()
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", builder =>
    {
        if (string.IsNullOrWhiteSpace(frontendOrigin))
        {
            builder.AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
            return;
        }

        builder.WithOrigins(frontendOrigin)
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

var app = builder.Build();
var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    try
    {
        dbContext.Database.Migrate();
    }
    catch (PostgresException ex) when (ex.SqlState == "42P07")
    {
        BaselineExistingSchemaMigrations(dbContext);
        dbContext.Database.Migrate();
    }

    EnsureLegacySchemaCompatibility(dbContext);
}

using (var scope = app.Services.CreateScope())
{
    var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    try
    {
        recurringJobManager.AddOrUpdate<OverdueParcelAutoPaymentJob>(
            "auto-pay-overdue-parcels",
            job => job.Execute(),
            Cron.Minutely);

        recurringJobManager.AddOrUpdate<LoanContractGenerationConsumer>(
            "generate-loan-contracts",
            job => job.Execute(),
            Cron.Minutely);
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Não foi possível registrar os recurring jobs do Hangfire no startup. A aplicação continuará e o agendamento pode ser registrado manualmente via POST /api/admin/processar-contratos.");
    }
}

app.UseCors("AllowFrontend");

// Habilita o mapeamento das rotas dos Controllers
app.MapControllers();

// Se quiser rodar a lógica de teste automaticamente ao iniciar, 
// podemos deixar um log aqui, mas o ideal agora é chamar via URL
Console.WriteLine("API de Crédito Rodando... ");
Console.WriteLine("Acesse: http://localhost:5000/api/clientes");

app.Run();

static void BaselineExistingSchemaMigrations(AppDbContext dbContext)
{
    EnsureMigrationsHistoryTable(dbContext);

    var pending = dbContext.Database.GetPendingMigrations().ToHashSet();

    if (pending.Contains("20260802233449_InitialCreate") && TableExists(dbContext, "clientes"))
    {
        InsertMigrationHistoryIfMissing(dbContext, "20260802233449_InitialCreate");
    }

    if (pending.Contains("20260802234218_AddCreditCatalogTables")
        && TableExists(dbContext, "credit_offers")
        && TableExists(dbContext, "credit_limit_requests"))
    {
        InsertMigrationHistoryIfMissing(dbContext, "20260802234218_AddCreditCatalogTables");
    }

    if (pending.Contains("20260804000000_AddTipoPagamentoToContratos")
        && ColumnExists(dbContext, "contratos", "tipo_pagamento"))
    {
        InsertMigrationHistoryIfMissing(dbContext, "20260804000000_AddTipoPagamentoToContratos");
    }

    if (pending.Contains("20260804003000_AddContractTemplatesAndLoanContractColumns")
        && TableExists(dbContext, "contract_templates")
        && ColumnExists(dbContext, "contratos", "id_template_contrato")
        && ColumnExists(dbContext, "contratos", "contrato_gerado_texto")
        && ColumnExists(dbContext, "contratos", "contrato_gerado_em")
        && ColumnExists(dbContext, "contratos", "assinado_em"))
    {
        InsertMigrationHistoryIfMissing(dbContext, "20260804003000_AddContractTemplatesAndLoanContractColumns");
    }

    if (pending.Contains("20260804005000_AddDesembolsoAutorizadoEmToContratos")
        && ColumnExists(dbContext, "contratos", "desembolso_autorizado_em"))
    {
        InsertMigrationHistoryIfMissing(dbContext, "20260804005000_AddDesembolsoAutorizadoEmToContratos");
    }

    if (pending.Contains("20260804012000_AddOperationalControlTable")
        && TableExists(dbContext, "operational_control"))
    {
        InsertMigrationHistoryIfMissing(dbContext, "20260804012000_AddOperationalControlTable");
    }

    if (pending.Contains("20260804020000_AddAccountMovementsTable")
        && TableExists(dbContext, "account_movements"))
    {
        InsertMigrationHistoryIfMissing(dbContext, "20260804020000_AddAccountMovementsTable");
    }
}

static void EnsureMigrationsHistoryTable(AppDbContext dbContext)
{
    dbContext.Database.ExecuteSqlRaw(@"
CREATE TABLE IF NOT EXISTS ""__EFMigrationsHistory"" (
    ""MigrationId"" character varying(150) NOT NULL,
    ""ProductVersion"" character varying(32) NOT NULL,
    CONSTRAINT ""PK___EFMigrationsHistory"" PRIMARY KEY (""MigrationId"")
);");
}

static void InsertMigrationHistoryIfMissing(AppDbContext dbContext, string migrationId)
{
    dbContext.Database.ExecuteSqlInterpolated($@"
INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
SELECT {migrationId}, {"10.0.0"}
WHERE NOT EXISTS (
    SELECT 1 FROM ""__EFMigrationsHistory"" WHERE ""MigrationId"" = {migrationId}
);");
}

static bool TableExists(AppDbContext dbContext, string tableName)
{
    var connection = dbContext.Database.GetDbConnection();
    var shouldClose = connection.State != System.Data.ConnectionState.Open;

    if (shouldClose)
    {
        connection.Open();
    }

    try
    {
        using var command = connection.CreateCommand();
        command.CommandText = @"
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = @tableName
);";

        var parameter = command.CreateParameter();
        parameter.ParameterName = "@tableName";
        parameter.Value = tableName;
        command.Parameters.Add(parameter);

        return Convert.ToBoolean(command.ExecuteScalar());
    }
    finally
    {
        if (shouldClose)
        {
            connection.Close();
        }
    }
}

static bool ColumnExists(AppDbContext dbContext, string tableName, string columnName)
{
    var connection = dbContext.Database.GetDbConnection();
    var shouldClose = connection.State != System.Data.ConnectionState.Open;

    if (shouldClose)
    {
        connection.Open();
    }

    try
    {
        using var command = connection.CreateCommand();
        command.CommandText = @"
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = @tableName AND column_name = @columnName
);";

        var tableParameter = command.CreateParameter();
        tableParameter.ParameterName = "@tableName";
        tableParameter.Value = tableName;
        command.Parameters.Add(tableParameter);

        var columnParameter = command.CreateParameter();
        columnParameter.ParameterName = "@columnName";
        columnParameter.Value = columnName;
        command.Parameters.Add(columnParameter);

        return Convert.ToBoolean(command.ExecuteScalar());
    }
    finally
    {
        if (shouldClose)
        {
            connection.Close();
        }
    }
}

static void EnsureLegacySchemaCompatibility(AppDbContext dbContext)
{
    if (TableExists(dbContext, "contratos"))
    {
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS tipo_pagamento varchar(50);");
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS conta_desembolso_id integer;");
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'geração de contratos';");
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS id_template_contrato varchar(100);");
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS contrato_gerado_texto text;");
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS contrato_gerado_em timestamptz;");
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS assinado_em timestamptz;");
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS desembolso_autorizado_em timestamptz;");
        dbContext.Database.ExecuteSqlRaw("UPDATE contratos SET status = COALESCE(status, 'geração de contratos') WHERE status IS NULL OR status = '';");
    }

    dbContext.Database.ExecuteSqlRaw(@"
CREATE TABLE IF NOT EXISTS contract_templates (
    id_template varchar(100) NOT NULL PRIMARY KEY,
    nome varchar(200) NOT NULL,
    conteudo text NOT NULL,
    ativo boolean NOT NULL DEFAULT TRUE,
    criado_em timestamptz NOT NULL DEFAULT NOW(),
    atualizado_em timestamptz NULL
);");

    dbContext.Database.ExecuteSqlRaw(@"
CREATE TABLE IF NOT EXISTS operational_control (
    id integer NOT NULL PRIMARY KEY,
    data_operacional date NULL
);");

    dbContext.Database.ExecuteSqlRaw(@"
INSERT INTO operational_control (id, data_operacional)
SELECT 1, NULL
WHERE NOT EXISTS (SELECT 1 FROM operational_control WHERE id = 1);");

    if (TableExists(dbContext, "credit_offers"))
    {
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE credit_offers ADD COLUMN IF NOT EXISTS cliente_id integer;");
        dbContext.Database.ExecuteSqlRaw("UPDATE credit_offers SET cliente_id = 0 WHERE cliente_id IS NULL;");
    }

    dbContext.Database.ExecuteSqlRaw(@"
CREATE TABLE IF NOT EXISTS account_movements (
    id_movimentacao integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    id_cliente integer NOT NULL,
    id_conta integer NOT NULL,
    tipo varchar(60) NOT NULL,
    valor numeric(12,2) NOT NULL,
    saldo_anterior numeric(12,2) NOT NULL,
    saldo_atual numeric(12,2) NOT NULL,
    descricao text NULL,
    id_contrato integer NULL,
    id_parcela integer NULL,
    data_operacional date NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_account_movements_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    CONSTRAINT fk_account_movements_conta FOREIGN KEY (id_conta) REFERENCES contas(id_conta) ON DELETE CASCADE
);");

    dbContext.Database.ExecuteSqlRaw("CREATE INDEX IF NOT EXISTS idx_account_movements_cliente ON account_movements (id_cliente, id_movimentacao DESC);");
    dbContext.Database.ExecuteSqlRaw("CREATE INDEX IF NOT EXISTS idx_account_movements_data ON account_movements (data_operacional DESC);");

    if (TableExists(dbContext, "parcelas"))
    {
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE parcelas ALTER COLUMN status_pagamento TYPE varchar(30);");
    }
}
