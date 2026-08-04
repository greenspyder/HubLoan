using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace CreditoSimulador.App.Services;

public class ContractDocxService
{
    public byte[] BuildContractDocument(string titulo, string conteudo, DateTime? dataGeracao)
    {
        using var stream = new MemoryStream();
        using (var wordDocument = WordprocessingDocument.Create(stream, WordprocessingDocumentType.Document, true))
        {
            var mainPart = wordDocument.AddMainDocumentPart();
            mainPart.Document = new Document(new Body());
            var body = mainPart.Document.Body!;

            body.Append(CreateParagraph(titulo, true));
            var dataTexto = dataGeracao.HasValue ? dataGeracao.Value.ToString("dd/MM/yyyy") : "não informada";
            body.Append(CreateParagraph($"Gerado em {dataTexto}", false));
            body.Append(CreateParagraph(string.Empty, false));

            foreach (var line in conteudo.Split('\n', StringSplitOptions.None))
            {
                body.Append(CreateParagraph(line.TrimEnd('\r'), false));
            }

            mainPart.Document.Save();
        }

        return stream.ToArray();
    }

    private static Paragraph CreateParagraph(string text, bool isTitle)
    {
        var runProperties = new RunProperties();
        if (isTitle)
        {
            runProperties.Append(new Bold());
            runProperties.Append(new FontSize { Val = "32" });
        }
        else
        {
            runProperties.Append(new FontSize { Val = "24" });
        }

        var run = new Run(runProperties, new Text(text) { Space = SpaceProcessingModeValues.Preserve });
        return new Paragraph(run);
    }
}
