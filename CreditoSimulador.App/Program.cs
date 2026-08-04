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

// Adiciona suporte a Controllers (para seu AdminController)
builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Host=localhost;Username=postgres;Password=13531;Database=postgres"));

builder.Services.AddHangfire(configuration =>
{
    configuration.UsePostgreSqlStorage(options =>
        options.UseNpgsqlConnection(builder.Configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Username=postgres;Password=13531;Database=postgres"));
});
builder.Services.AddHangfireServer();

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
builder.Services.AddScoped<CriarOfertaHandler>();
builder.Services.AddScoped<ListarOfertasHandler>();
builder.Services.AddScoped<ListarSolicitacoesAdminHandler>();
builder.Services.AddScoped<OverdueParcelAutoPaymentJob>();
builder.Services.AddScoped<LoanContractGenerationConsumer>();

// Adicione ANTES de app.Build()
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()  // Permite GET, POST, OPTIONS, etc
               .AllowAnyHeader(); // Permite todos os headers incluindo X-Customer-Id
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
    catch (DistributedLockTimeoutException ex)
    {
        logger.LogWarning(ex, "Não foi possível obter lock distribuído do Hangfire para registrar o recurring job neste startup. A aplicação continuará e o agendamento poderá ser registrado por outra instância.");
    }
}

app.UseCors("AllowAll");

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
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'geração de contratos';");
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS id_template_contrato varchar(100);");
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS contrato_gerado_texto text;");
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS contrato_gerado_em timestamptz;");
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS assinado_em timestamptz;");
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

    if (TableExists(dbContext, "parcelas"))
    {
        dbContext.Database.ExecuteSqlRaw("ALTER TABLE parcelas ALTER COLUMN status_pagamento TYPE varchar(30);");
    }
}
