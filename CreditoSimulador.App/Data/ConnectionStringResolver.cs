using Microsoft.Extensions.Configuration;
using Npgsql;

namespace CreditoSimulador.App.Data;

public static class ConnectionStringResolver
{
    public static string ResolveFromEnvironment()
    {
        var rawConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING")
            ?? "Host=localhost;Username=postgres;Password=13531;Database=postgres";

        return Normalize(rawConnectionString);
    }

    public static string Resolve(IConfiguration configuration, string name = "DefaultConnection")
    {
        var rawConnectionString = configuration.GetConnectionString(name)
            ?? configuration["DATABASE_URL"]
            ?? "Host=localhost;Username=postgres;Password=13531;Database=postgres";

        return Normalize(rawConnectionString);
    }

    public static string Normalize(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return connectionString;
        }

        if (connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase)
            || connectionString.Contains("Server=", StringComparison.OrdinalIgnoreCase))
        {
            return connectionString;
        }

        if (!Uri.TryCreate(connectionString, UriKind.Absolute, out var uri)
            || (uri.Scheme != "postgres" && uri.Scheme != "postgresql"))
        {
            return connectionString;
        }

        var userInfo = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort ? 5432 : uri.Port,
            Username = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(0) ?? string.Empty),
            Password = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(1) ?? string.Empty),
            Database = uri.AbsolutePath.Trim('/')
        };

        var query = ParseQuery(uri.Query);

        if (query.TryGetValue("sslmode", out var sslModeValue)
            && Enum.TryParse<SslMode>(sslModeValue, true, out var sslMode))
        {
            builder.SslMode = sslMode;
        }

        if (query.TryGetValue("pooling", out var poolingValue)
            && bool.TryParse(poolingValue, out var pooling))
        {
            builder.Pooling = pooling;
        }

        return builder.ConnectionString;
    }

    private static Dictionary<string, string> ParseQuery(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        return query.TrimStart('?')
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2))
            .Where(part => part.Length == 2)
            .ToDictionary(
                part => Uri.UnescapeDataString(part[0]),
                part => Uri.UnescapeDataString(part[1]),
                StringComparer.OrdinalIgnoreCase);
    }
}