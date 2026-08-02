namespace Credito.Calculos
{
    // Esta classe serve para transportar os dados do cálculo de volta para o Controller
    public class ResultadoParcela
    {
        public int Numero { get; set; }
        public decimal Amortizacao { get; set; }
        public decimal Juros { get; set; }
        public decimal Total { get; set; }
    }

    public class CalculadoraAmortizacao
    {
        public List<ResultadoParcela> GerarCronograma(decimal principal, decimal taxa, int parcelas, string tipo)
        {
            var cronograma = new List<ResultadoParcela>();
            decimal saldoDevedor = principal;

            for (int i = 1; i <= parcelas; i++)
            {
                decimal juros = saldoDevedor * taxa;
                decimal amort, total;

                if (tipo == "SAC")
                {
                    amort = principal / parcelas;
                    total = amort + juros;
                }
                else
                { // PRICE
                    double t = (double)taxa;
                    double pmt = (double)principal * (t * Math.Pow(1 + t, parcelas)) / (Math.Pow(1 + t, parcelas) - 1);
                    total = (decimal)pmt;
                    amort = total - juros;
                }

                cronograma.Add(new ResultadoParcela
                {
                    Numero = i,
                    Amortizacao = amort,
                    Juros = juros,
                    Total = total
                });

                saldoDevedor -= amort;
            }
            return cronograma;
        }
    }
}
