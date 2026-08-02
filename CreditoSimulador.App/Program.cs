using CreditoSimulador.App.Data;
using CreditoSimulador.App.Handlers;
using CreditoSimulador.App.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

// Adiciona suporte a Controllers (para seu AdminController)
builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Host=localhost;Username=postgres;Password=13531;Database=postgres"));

builder.Services.AddScoped<InMemoryCreditCatalog>();
builder.Services.AddScoped<ListarClientesHandler>();
builder.Services.AddScoped<ListarContratosHandler>();
builder.Services.AddScoped<ListarParcelasHandler>();
builder.Services.AddScoped<ProcessarContratoHandler>();
builder.Services.AddScoped<PagarParcelaHandler>();
builder.Services.AddScoped<SimularCreditoHandler>();
builder.Services.AddScoped<ContratarCreditoHandler>();
builder.Services.AddScoped<ObterDetalhesContratoHandler>();
builder.Services.AddScoped<CriarOfertaHandler>();
builder.Services.AddScoped<ListarOfertasHandler>();
builder.Services.AddScoped<ListarSolicitacoesAdminHandler>();

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

app.UseCors("AllowAll");

// Habilita o mapeamento das rotas dos Controllers
app.MapControllers();

// Se quiser rodar a lógica de teste automaticamente ao iniciar, 
// podemos deixar um log aqui, mas o ideal agora é chamar via URL
Console.WriteLine("API de Crédito Rodando... ");
Console.WriteLine("Acesse: http://localhost:5000/api/clientes");

app.Run();
