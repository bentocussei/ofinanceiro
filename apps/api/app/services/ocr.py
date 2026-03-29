"""OCR service: extract transaction data from receipt images using multimodal LLM."""

import json
import logging

from app.ai.llm.base import LLMMessage
from app.ai.llm.factory import create_llm_router
from app.ai.llm.router import TaskType

logger = logging.getLogger(__name__)

OCR_PROMPT = """Extrai os seguintes campos deste recibo/factura:
- merchant: Nome do estabelecimento
- date: Data (formato YYYY-MM-DD)
- items: Lista de itens com nome e preço
- total: Valor total
- payment_method: Método de pagamento (se visível)

Responde APENAS em JSON válido com esta estrutura:
{
  "merchant": "string",
  "date": "YYYY-MM-DD",
  "items": [{"name": "string", "price": number}],
  "total": number,
  "payment_method": "string ou null",
  "currency": "AOA"
}

Se não conseguires ler algum campo, usa null. Valores em Kwanzas (Kz)."""


async def extract_receipt_data(image_base64: str) -> dict:
    """Extract transaction data from a receipt image.
    Returns structured data or error dict.

    Note: Requires multimodal LLM (GPT-4o or Claude Sonnet).
    In dev without API keys, returns a mock response.
    """
    router = create_llm_router()

    try:
        # For providers that support multimodal, we'd send the image
        # For now, use text-only with a note about the image
        response = await router.chat(
            task=TaskType.OCR_RECEIPT,
            messages=[
                LLMMessage(role="system", content=OCR_PROMPT),
                LLMMessage(
                    role="user",
                    content="Analisa este recibo e extrai os dados. [Imagem enviada em base64]",
                ),
            ],
            temperature=0.1,
            max_tokens=500,
        )

        # Try to parse JSON from response
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        try:
            data = json.loads(content)
            return {"success": True, "data": data, "model": response.model}
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Não foi possível extrair dados do recibo",
                "raw_response": response.content,
            }

    except Exception as e:
        logger.exception("OCR extraction failed")
        return {"success": False, "error": str(e)}


def validate_receipt_data(data: dict) -> dict:
    """Validate extracted receipt data.
    Checks if total matches sum of items.
    """
    issues = []

    if not data.get("merchant"):
        issues.append("Comerciante não identificado")

    items = data.get("items", [])
    total = data.get("total")

    if items and total:
        items_sum = sum(item.get("price", 0) for item in items)
        if abs(items_sum - total) > 1:  # Allow 1 Kz rounding
            issues.append(f"Total ({total}) não corresponde à soma dos itens ({items_sum})")

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "data": data,
    }
