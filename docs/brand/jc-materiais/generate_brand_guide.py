from __future__ import annotations

import os
from pathlib import Path

from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


HERE = Path(__file__).resolve().parent
WEB_ROOT = HERE.parents[2]
SOURCE_DIR = HERE / "assets" / "source"
OUTPUT_PATH = WEB_ROOT / "output" / "pdf" / "jc-materiais-brand-guide-v1.pdf"

PAGE_W, PAGE_H = landscape(A4)
MARGIN = 46

FOREST = HexColor("#005A3D")
GREEN = HexColor("#00875F")
MINT = HexColor("#00B982")
INK = HexColor("#071611")
SLATE = HexColor("#52655D")
MIST = HexColor("#EAF3EF")
PAPER = HexColor("#F7FAF8")
LINE = HexColor("#D9E7E1")
SOFT_GREEN = HexColor("#D6F4E7")


def register_fonts() -> None:
    fonts_dir = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"
    pdfmetrics.registerFont(TTFont("JCRegular", fonts_dir / "segoeui.ttf"))
    pdfmetrics.registerFont(TTFont("JCSemibold", fonts_dir / "seguisb.ttf"))
    pdfmetrics.registerFont(TTFont("JCBold", fonts_dir / "segoeuib.ttf"))


def rounded_rect(
    pdf: canvas.Canvas,
    x: float,
    y: float,
    width: float,
    height: float,
    radius: float = 16,
    fill: Color = white,
    stroke: Color | None = LINE,
) -> None:
    pdf.setFillColor(fill)
    if stroke is None:
        pdf.setStrokeColor(fill)
        pdf.setLineWidth(0)
    else:
        pdf.setStrokeColor(stroke)
        pdf.setLineWidth(0.8)
    pdf.roundRect(x, y, width, height, radius, fill=1, stroke=1 if stroke else 0)


def draw_image_contain(
    pdf: canvas.Canvas,
    image_path: Path,
    x: float,
    y: float,
    width: float,
    height: float,
    padding: float = 0,
) -> None:
    image = ImageReader(str(image_path))
    image_width, image_height = image.getSize()
    available_width = width - padding * 2
    available_height = height - padding * 2
    scale = min(available_width / image_width, available_height / image_height)
    rendered_width = image_width * scale
    rendered_height = image_height * scale
    pdf.drawImage(
        image,
        x + (width - rendered_width) / 2,
        y + (height - rendered_height) / 2,
        rendered_width,
        rendered_height,
        preserveAspectRatio=True,
        mask="auto",
    )


def split_lines(text: str, font: str, font_size: float, max_width: float) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if current and pdfmetrics.stringWidth(candidate, font, font_size) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def draw_wrapped(
    pdf: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    max_width: float,
    font: str = "JCRegular",
    size: float = 11,
    color: Color = SLATE,
    leading: float | None = None,
    max_lines: int | None = None,
) -> float:
    line_height = leading or size * 1.45
    lines = split_lines(text, font, size, max_width)
    if max_lines is not None:
        lines = lines[:max_lines]
    pdf.setFont(font, size)
    pdf.setFillColor(color)
    for line in lines:
        pdf.drawString(x, y, line)
        y -= line_height
    return y


def draw_label(pdf: canvas.Canvas, text: str, x: float, y: float, color: Color = GREEN) -> None:
    pdf.setFillColor(color)
    pdf.setFont("JCBold", 8.5)
    pdf.drawString(x, y, text.upper())


def draw_page_title(
    pdf: canvas.Canvas,
    eyebrow: str,
    title: str,
    description: str,
    page: int,
) -> None:
    draw_label(pdf, eyebrow, MARGIN, PAGE_H - 49)
    pdf.setFillColor(INK)
    pdf.setFont("JCBold", 28)
    pdf.drawString(MARGIN, PAGE_H - 85, title)
    draw_wrapped(pdf, description, MARGIN, PAGE_H - 109, 560, size=10.5, leading=15)
    pdf.setFillColor(SLATE)
    pdf.setFont("JCSemibold", 8)
    pdf.drawRightString(PAGE_W - MARGIN, PAGE_H - 49, f"JC MATERIAIS  /  {page:02d}")


def draw_footer(pdf: canvas.Canvas, page: int) -> None:
    pdf.setStrokeColor(LINE)
    pdf.setLineWidth(0.6)
    pdf.line(MARGIN, 28, PAGE_W - MARGIN, 28)
    pdf.setFillColor(SLATE)
    pdf.setFont("JCRegular", 7.5)
    pdf.drawString(MARGIN, 16, "Identidade visual v1  |  Uso digital e institucional")
    pdf.drawRightString(PAGE_W - MARGIN, 16, f"{page:02d}")


def cover(pdf: canvas.Canvas) -> None:
    pdf.setFillColor(PAPER)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    pdf.setFillColor(FOREST)
    pdf.roundRect(0, 0, PAGE_W * 0.38, PAGE_H, 0, fill=1, stroke=0)
    pdf.setFillColor(MINT)
    pdf.circle(82, PAGE_H - 86, 8, fill=1, stroke=0)
    pdf.setFont("JCBold", 9)
    pdf.drawString(103, PAGE_H - 90, "IDENTIDADE VISUAL V1")
    pdf.setFillColor(white)
    pdf.setFont("JCBold", 41)
    pdf.drawString(48, 326, "Precisao")
    pdf.drawString(48, 281, "com cuidado.")
    draw_wrapped(
        pdf,
        "Um sistema visual para uma empresa que conecta materiais, operacao e saude com confianca em cada entrega.",
        48,
        238,
        238,
        size=12,
        color=HexColor("#CDE1D8"),
        leading=18,
    )
    rounded_rect(pdf, 365, 92, 414, 410, 28, white, None)
    draw_image_contain(
        pdf,
        SOURCE_DIR / "jc-materiais-logo-stacked.png",
        403,
        145,
        338,
        305,
        8,
    )
    pdf.setFillColor(SLATE)
    pdf.setFont("JCRegular", 9)
    pdf.drawCentredString(572, 123, "Manual de uso da marca  |  Agosto de 2026")
    pdf.showPage()


def essence_page(pdf: canvas.Canvas, page: int) -> None:
    pdf.setFillColor(PAPER)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    draw_page_title(
        pdf,
        "01  Fundamentos",
        "A marca em uma frase",
        "A JC Materiais Hospitalares transforma demanda complexa em fornecimento confiavel, organizado e humano.",
        page,
    )
    quote_y = 357
    pdf.setFillColor(FOREST)
    pdf.setFont("JCBold", 31)
    pdf.drawString(MARGIN, quote_y, "Materiais certos.")
    pdf.setFillColor(GREEN)
    pdf.drawString(MARGIN, quote_y - 42, "Operacao clara.")
    pdf.setFillColor(MINT)
    pdf.drawString(MARGIN, quote_y - 84, "Cuidado em cada entrega.")

    values = [
        ("Precisao", "Informacao correta, leitura rapida e controle do detalhe."),
        ("Confianca", "Uma presenca madura para decisoes e relacoes de longo prazo."),
        ("Agilidade", "Movimento sem improviso, com processos visiveis e rastreaveis."),
        ("Cuidado", "O contexto hospitalar exige responsabilidade em cada escolha."),
    ]
    card_width = 166
    card_gap = 14
    card_y = 74
    for index, (title, description) in enumerate(values):
        x = MARGIN + index * (card_width + card_gap)
        rounded_rect(pdf, x, card_y, card_width, 142, 16, white, LINE)
        pdf.setFillColor([FOREST, GREEN, MINT, INK][index])
        pdf.circle(x + 24, card_y + 113, 8, fill=1, stroke=0)
        pdf.setFillColor(INK)
        pdf.setFont("JCBold", 14)
        pdf.drawString(x + 18, card_y + 82, title)
        draw_wrapped(pdf, description, x + 18, card_y + 60, card_width - 36, size=9.2, leading=13)
    draw_footer(pdf, page)
    pdf.showPage()


def logo_page(pdf: canvas.Canvas, page: int) -> None:
    pdf.setFillColor(PAPER)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    draw_page_title(
        pdf,
        "02  Logo",
        "Um sistema, tres assinaturas",
        "A assinatura horizontal e a principal. A vertical atende capas e formatos quadrados; o simbolo resolve espacos compactos.",
        page,
    )
    top_y = 291
    rounded_rect(pdf, MARGIN, top_y, 458, 180, 18, white, LINE)
    draw_image_contain(pdf, SOURCE_DIR / "jc-materiais-wordmark.png", MARGIN + 22, top_y + 30, 414, 120)
    draw_label(pdf, "Assinatura principal", MARGIN + 18, top_y + 16)

    right_x = 526
    rounded_rect(pdf, right_x, top_y, 268, 180, 18, white, LINE)
    draw_image_contain(pdf, SOURCE_DIR / "jc-materiais-logo-stacked.png", right_x + 22, top_y + 22, 224, 137)
    draw_label(pdf, "Assinatura vertical", right_x + 18, top_y + 16)

    bottom_y = 72
    rounded_rect(pdf, MARGIN, bottom_y, 230, 191, 18, white, LINE)
    draw_image_contain(pdf, SOURCE_DIR / "jc-materiais-icon.png", MARGIN + 50, bottom_y + 40, 130, 130)
    draw_label(pdf, "Simbolo", MARGIN + 18, bottom_y + 17)

    safe_x = 297
    rounded_rect(pdf, safe_x, bottom_y, 497, 191, 18, white, LINE)
    pdf.setDash(3, 3)
    pdf.setStrokeColor(GREEN)
    pdf.setLineWidth(1)
    pdf.rect(safe_x + 28, bottom_y + 41, 122, 122, fill=0, stroke=1)
    pdf.setDash()
    draw_image_contain(pdf, SOURCE_DIR / "jc-materiais-icon.png", safe_x + 47, bottom_y + 60, 84, 84)
    pdf.setFillColor(INK)
    pdf.setFont("JCBold", 13)
    pdf.drawString(safe_x + 180, bottom_y + 140, "Area de respiro")
    draw_wrapped(
        pdf,
        "Mantenha ao redor da marca uma folga minima equivalente a metade da largura da cruz do simbolo.",
        safe_x + 180,
        bottom_y + 116,
        275,
        size=9.3,
        leading=13,
    )
    draw_label(pdf, "Minimos", safe_x + 180, bottom_y + 70)
    draw_wrapped(
        pdf,
        "Simbolo 24 px / 8 mm  |  Horizontal 160 px / 45 mm  |  Vertical 120 px / 35 mm",
        safe_x + 180,
        bottom_y + 51,
        275,
        size=8.6,
        leading=12,
    )
    draw_footer(pdf, page)
    pdf.showPage()


def color_page(pdf: canvas.Canvas, page: int) -> None:
    pdf.setFillColor(PAPER)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    draw_page_title(
        pdf,
        "03  Cor",
        "Verdes que unem saude e operacao",
        "O verde profundo ancora confianca. O verde luminoso adiciona movimento, tecnologia e leitura de progresso.",
        page,
    )
    swatches = [
        ("Forest", "#005A3D", FOREST, white),
        ("Green", "#00875F", GREEN, white),
        ("Mint", "#00B982", MINT, INK),
        ("Ink", "#071611", INK, white),
        ("Slate", "#52655D", SLATE, white),
        ("Mist", "#EAF3EF", MIST, INK),
        ("Paper", "#F7FAF8", PAPER, INK),
        ("White", "#FFFFFF", white, INK),
    ]
    swatch_width = 174
    swatch_height = 145
    gap = 12
    start_y = 283
    for index, (name, value, fill, text_color) in enumerate(swatches):
        row = index // 4
        column = index % 4
        x = MARGIN + column * (swatch_width + gap)
        y = start_y - row * (swatch_height + 18)
        rounded_rect(pdf, x, y, swatch_width, swatch_height, 16, fill, LINE if fill in (white, PAPER, MIST) else None)
        pdf.setFillColor(text_color)
        pdf.setFont("JCBold", 13)
        pdf.drawString(x + 16, y + 31, name)
        pdf.setFont("JCRegular", 9)
        pdf.drawString(x + 16, y + 16, value)
    pdf.setFillColor(FOREST)
    pdf.roundRect(MARGIN, 60, 360, 56, 16, fill=1, stroke=0)
    pdf.setFillColor(white)
    pdf.setFont("JCSemibold", 10)
    pdf.drawString(MARGIN + 18, 92, "Par principal")
    pdf.setFont("JCRegular", 9)
    pdf.drawString(MARGIN + 18, 75, "Forest sobre White  |  White sobre Forest")
    pdf.setFillColor(MIST)
    pdf.roundRect(422, 60, 372, 56, 16, fill=1, stroke=0)
    pdf.setFillColor(INK)
    pdf.setFont("JCSemibold", 10)
    pdf.drawString(440, 92, "Par de apoio")
    pdf.setFont("JCRegular", 9)
    pdf.drawString(440, 75, "Ink sobre Mist  |  Forest sobre Paper")
    draw_footer(pdf, page)
    pdf.showPage()


def typography_page(pdf: canvas.Canvas, page: int) -> None:
    pdf.setFillColor(PAPER)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    draw_page_title(
        pdf,
        "04  Tipografia",
        "Tecnica sem parecer fria",
        "Sora organiza titulos e numeros. Manrope sustenta textos, tabelas e interfaces. Arial permanece como fallback operacional.",
        page,
    )
    card_y = 142
    card_h = 321
    card_w = 360
    rounded_rect(pdf, MARGIN, card_y, card_w, card_h, 18, white, LINE)
    draw_label(pdf, "Display", MARGIN + 22, card_y + card_h - 29)
    pdf.setFillColor(FOREST)
    pdf.setFont("JCBold", 63)
    pdf.drawString(MARGIN + 22, card_y + 190, "Aa 012")
    pdf.setFillColor(INK)
    pdf.setFont("JCBold", 20)
    pdf.drawString(MARGIN + 22, card_y + 133, "Sora 600 / 700")
    draw_wrapped(
        pdf,
        "Titulos, indicadores, chamadas, etapas de processo e numeros que precisam de leitura imediata.",
        MARGIN + 22,
        card_y + 106,
        card_w - 44,
        size=10,
        leading=14,
    )

    right_x = 434
    rounded_rect(pdf, right_x, card_y, card_w, card_h, 18, white, LINE)
    draw_label(pdf, "Texto", right_x + 22, card_y + card_h - 29)
    pdf.setFillColor(GREEN)
    pdf.setFont("JCRegular", 63)
    pdf.drawString(right_x + 22, card_y + 190, "Aa 012")
    pdf.setFillColor(INK)
    pdf.setFont("JCBold", 20)
    pdf.drawString(right_x + 22, card_y + 133, "Manrope 400 / 600")
    draw_wrapped(
        pdf,
        "Textos longos, descricoes de produtos, campos, tabelas, relatorios e documentos comerciais.",
        right_x + 22,
        card_y + 106,
        card_w - 44,
        size=10,
        leading=14,
    )
    pdf.setFillColor(SOFT_GREEN)
    pdf.roundRect(MARGIN, 68, PAGE_W - MARGIN * 2, 52, 14, fill=1, stroke=0)
    pdf.setFillColor(FOREST)
    pdf.setFont("JCSemibold", 9.5)
    pdf.drawString(MARGIN + 18, 91, "Importante")
    pdf.setFont("JCRegular", 9)
    pdf.drawString(MARGIN + 92, 91, "As fontes formam o sistema de comunicacao. O lettering do logo original nao deve ser redigitado.")
    draw_footer(pdf, page)
    pdf.showPage()


def applications_page(pdf: canvas.Canvas, page: int) -> None:
    pdf.setFillColor(PAPER)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    draw_page_title(
        pdf,
        "05  Aplicacoes",
        "Da operacao ao documento",
        "A identidade deve organizar informacao antes de decorar a interface. Verde indica acao, progresso e confianca.",
        page,
    )
    panel_x = MARGIN
    panel_y = 80
    panel_w = 462
    panel_h = 380
    rounded_rect(pdf, panel_x, panel_y, panel_w, panel_h, 20, INK, None)
    pdf.setFillColor(HexColor("#10231C"))
    pdf.roundRect(panel_x + 18, panel_y + 18, 123, panel_h - 36, 15, fill=1, stroke=0)
    draw_image_contain(pdf, SOURCE_DIR / "jc-materiais-wordmark.png", panel_x + 28, panel_y + panel_h - 82, 103, 45)
    menu = ["Painel", "Cotacoes", "Ordens", "Produtos", "Financeiro"]
    for index, item in enumerate(menu):
        y = panel_y + panel_h - 126 - index * 39
        if index == 0:
            pdf.setFillColor(FOREST)
            pdf.roundRect(panel_x + 29, y - 11, 101, 28, 8, fill=1, stroke=0)
        pdf.setFillColor(white if index == 0 else HexColor("#9AB2A8"))
        pdf.setFont("JCSemibold", 8.5)
        pdf.drawString(panel_x + 42, y, item)

    content_x = panel_x + 162
    pdf.setFillColor(white)
    pdf.setFont("JCBold", 19)
    pdf.drawString(content_x, panel_y + panel_h - 54, "Visao da operacao")
    metrics = [("A comprar", "12"), ("Em transito", "8"), ("Prontos", "5")]
    for index, (label, value) in enumerate(metrics):
        x = content_x + index * 92
        pdf.setFillColor(HexColor("#152B22"))
        pdf.roundRect(x, panel_y + 218, 82, 86, 12, fill=1, stroke=0)
        pdf.setFillColor(HexColor("#93AEA3"))
        pdf.setFont("JCRegular", 7.4)
        pdf.drawString(x + 10, panel_y + 279, label)
        pdf.setFillColor(MINT)
        pdf.setFont("JCBold", 23)
        pdf.drawString(x + 10, panel_y + 242, value)
    pdf.setFillColor(HexColor("#152B22"))
    pdf.roundRect(content_x, panel_y + 57, 266, 139, 12, fill=1, stroke=0)
    pdf.setFillColor(white)
    pdf.setFont("JCSemibold", 9)
    pdf.drawString(content_x + 14, panel_y + 176, "Pedidos recentes")
    for index, value in enumerate(["OC 2787", "OC 2811", "OC 2830"]):
        line_y = panel_y + 147 - index * 31
        pdf.setFillColor(HexColor("#89A399"))
        pdf.setFont("JCRegular", 8)
        pdf.drawString(content_x + 14, line_y, value)
        pdf.setFillColor(MINT if index == 0 else GREEN)
        pdf.circle(content_x + 245, line_y + 3, 4, fill=1, stroke=0)

    doc_x = 532
    doc_y = 80
    doc_w = 262
    doc_h = 380
    rounded_rect(pdf, doc_x, doc_y, doc_w, doc_h, 18, white, LINE)
    draw_image_contain(pdf, SOURCE_DIR / "jc-materiais-wordmark.png", doc_x + 22, doc_y + 311, 145, 49)
    pdf.setFillColor(SLATE)
    pdf.setFont("JCSemibold", 7.5)
    pdf.drawRightString(doc_x + doc_w - 20, doc_y + 343, "COTACAO")
    pdf.setFillColor(INK)
    pdf.setFont("JCBold", 13)
    pdf.drawString(doc_x + 22, doc_y + 279, "Proposta comercial")
    pdf.setFillColor(SLATE)
    pdf.setFont("JCRegular", 7.5)
    pdf.drawString(doc_x + 22, doc_y + 261, "Cliente  |  Unidade hospitalar")
    pdf.setFillColor(MIST)
    pdf.roundRect(doc_x + 20, doc_y + 119, doc_w - 40, 119, 8, fill=1, stroke=0)
    pdf.setFillColor(FOREST)
    pdf.setFont("JCSemibold", 7)
    pdf.drawString(doc_x + 31, doc_y + 217, "ITEM")
    pdf.drawString(doc_x + 159, doc_y + 217, "QTD")
    pdf.drawString(doc_x + 194, doc_y + 217, "TOTAL")
    rows = [("Material hospitalar A", "10", "R$ 980"), ("Material hospitalar B", "4", "R$ 440"), ("Material hospitalar C", "8", "R$ 760")]
    for index, row in enumerate(rows):
        row_y = doc_y + 190 - index * 27
        pdf.setFillColor(INK)
        pdf.setFont("JCRegular", 7.2)
        pdf.drawString(doc_x + 31, row_y, row[0])
        pdf.drawString(doc_x + 163, row_y, row[1])
        pdf.drawRightString(doc_x + 234, row_y, row[2])
    pdf.setFillColor(FOREST)
    pdf.setFont("JCBold", 10)
    pdf.drawRightString(doc_x + 240, doc_y + 86, "R$ 2.180,00")
    draw_footer(pdf, page)
    pdf.showPage()


def usage_page(pdf: canvas.Canvas, page: int) -> None:
    pdf.setFillColor(PAPER)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    draw_page_title(
        pdf,
        "06  Consistencia",
        "O que protege a marca",
        "Poucas regras, aplicadas sempre, fazem a identidade parecer maior e mais confiavel.",
        page,
    )
    rules = [
        (True, "Preserve a proporcao", "Redimensione sempre pelos cantos e mantenha o espaco de respiro."),
        (True, "Use contraste real", "Versao colorida em fundo claro; branca em fundo escuro."),
        (True, "Simplifique no pequeno", "Abaixo de 160 px, prefira apenas o simbolo."),
        (False, "Nao estique", "Nunca comprima a marca para caber em um espaco inadequado."),
        (False, "Nao aplique efeitos", "Sombras, contornos, brilhos e 3D adicional reduzem a clareza."),
        (False, "Nao recolora", "Nao adapte os verdes a campanhas ou cores do cliente."),
    ]
    card_w = 238
    card_h = 117
    gap_x = 14
    gap_y = 14
    start_y = 333
    for index, (is_good, title, description) in enumerate(rules):
        row = index // 3
        col = index % 3
        x = MARGIN + col * (card_w + gap_x)
        y = start_y - row * (card_h + gap_y)
        rounded_rect(pdf, x, y, card_w, card_h, 15, white, LINE)
        badge_fill = SOFT_GREEN if is_good else HexColor("#F6E7E2")
        badge_text = FOREST if is_good else HexColor("#A23D28")
        pdf.setFillColor(badge_fill)
        pdf.circle(x + 23, y + 91, 11, fill=1, stroke=0)
        pdf.setFillColor(badge_text)
        pdf.setFont("JCBold", 11)
        pdf.drawCentredString(x + 23, y + 87.5, "+" if is_good else "x")
        pdf.setFillColor(INK)
        pdf.setFont("JCBold", 11.5)
        pdf.drawString(x + 43, y + 87, title)
        draw_wrapped(pdf, description, x + 17, y + 58, card_w - 34, size=8.5, leading=12, max_lines=3)

    rounded_rect(pdf, MARGIN, 60, PAGE_W - MARGIN * 2, 130, 18, FOREST, None)
    pdf.setFillColor(white)
    pdf.setFont("JCBold", 17)
    pdf.drawString(MARGIN + 22, 154, "Checklist antes de publicar")
    checklist = [
        "Logo correto para o fundo",
        "Margens e tamanho minimo preservados",
        "Verdes oficiais sem alteracao",
        "Texto legivel e hierarquia simples",
    ]
    for index, item in enumerate(checklist):
        x = MARGIN + 22 + (index % 2) * 355
        y = 120 - (index // 2) * 30
        pdf.setFillColor(MINT)
        pdf.circle(x + 5, y + 3, 4, fill=1, stroke=0)
        pdf.setFillColor(HexColor("#D5E6DF"))
        pdf.setFont("JCRegular", 9.5)
        pdf.drawString(x + 18, y, item)
    draw_footer(pdf, page)
    pdf.showPage()


def files_page(pdf: canvas.Canvas, page: int) -> None:
    pdf.setFillColor(INK)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    draw_label(pdf, "07  Entrega", MARGIN, PAGE_H - 49, MINT)
    pdf.setFillColor(white)
    pdf.setFont("JCBold", 30)
    pdf.drawString(MARGIN, PAGE_H - 90, "Kit pronto para uso")
    draw_wrapped(
        pdf,
        "Os PNGs originais sao a assinatura oficial atual. Os SVGs normalizados ampliam o uso digital e devem passar por aprovacao final antes de impressao em grande formato.",
        MARGIN,
        PAGE_H - 119,
        610,
        size=10.5,
        color=HexColor("#BFD3CA"),
        leading=15,
    )
    groups = [
        ("Originais", ["jc-materiais-icon.png", "jc-materiais-logo-stacked.png", "jc-materiais-wordmark.png"]),
        ("Vetores", ["jc-symbol-color.svg", "jc-symbol-dark.svg", "jc-symbol-light.svg", "jc-logo-horizontal.svg", "jc-logo-stacked.svg"]),
        ("Sistema", ["brand-tokens.css", "brand-tokens.json", "preview.html", "manual PDF"]),
    ]
    group_y = 245
    group_w = 232
    for index, (title, files) in enumerate(groups):
        x = MARGIN + index * (group_w + 17)
        pdf.setFillColor(HexColor("#11261E"))
        pdf.roundRect(x, group_y, group_w, 196, 17, fill=1, stroke=0)
        pdf.setFillColor(MINT)
        pdf.setFont("JCBold", 12)
        pdf.drawString(x + 18, group_y + 159, title)
        for file_index, file_name in enumerate(files):
            y = group_y + 126 - file_index * 27
            pdf.setFillColor(HexColor("#90A99F"))
            pdf.circle(x + 22, y + 3, 3, fill=1, stroke=0)
            pdf.setFillColor(white)
            pdf.setFont("JCRegular", 8.5)
            pdf.drawString(x + 33, y, file_name)
    pdf.setFillColor(MINT)
    pdf.setFont("JCBold", 13)
    pdf.drawString(MARGIN, 225, "Proximo checkpoint")
    draw_wrapped(
        pdf,
        "Aprovar o redesenho vetorial, confirmar a tipografia definitiva e entao substituir os PNGs apenas onde o SVG tiver sido validado visualmente.",
        MARGIN,
        201,
        690,
        size=11,
        color=HexColor("#C8DBD3"),
        leading=16,
    )
    pdf.setFillColor(HexColor("#334A41"))
    pdf.setFont("JCRegular", 8)
    pdf.drawString(MARGIN, 44, "JC Materiais Hospitalares  |  Identidade visual v1  |  2026")
    pdf.showPage()


def build_pdf() -> Path:
    register_fonts()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT_PATH), pagesize=(PAGE_W, PAGE_H))
    pdf.setTitle("JC Materiais Hospitalares - Identidade visual v1")
    pdf.setAuthor("JC Materiais Hospitalares")
    pdf.setSubject("Manual de identidade visual")
    cover(pdf)
    essence_page(pdf, 2)
    logo_page(pdf, 3)
    color_page(pdf, 4)
    typography_page(pdf, 5)
    applications_page(pdf, 6)
    usage_page(pdf, 7)
    files_page(pdf, 8)
    pdf.save()
    return OUTPUT_PATH


if __name__ == "__main__":
    print(build_pdf())
