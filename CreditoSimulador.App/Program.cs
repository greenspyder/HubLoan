using CreditoSimulador.App.Handlers;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

// Adiciona suporte a Controllers (para seu AdminController)
builder.Services.AddControllers();

builder.Services.AddScoped<ListarClientesHandler>();
builder.Services.AddScoped<ListarContratosHandler>();
builder.Services.AddScoped<ListarParcelasHandler>();
builder.Services.AddScoped<ProcessarContratoHandler>();
builder.Services.AddScoped<PagarParcelaHandler>();

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

// Habilita o mapeamento das rotas dos Controllers
app.MapControllers();

// Se quiser rodar a lógica de teste automaticamente ao iniciar, 
// podemos deixar um log aqui, mas o ideal agora é chamar via URL
Console.WriteLine("API de Crédito Rodando... ");
Console.WriteLine("Acesse: http://localhost:5000/api/clientes");

app.Run();
