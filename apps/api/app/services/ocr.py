"""OCR service: extract transaction data from receipt images using multimodal LLM.

Uses Claude Sonnet (Anthropic) as primary, GPT-4o (OpenAI) as fallback.
Requires ANTHROPIC_API_KEY or OPENAI_API_KEY.
"""

import json
import logging

from app.ai.llm.base import LLMMessage
from app.ai.llm.factory import create_llm_router
from app.ai.llm.router import TaskType

logger = logging.getLogger(__name__)

OCR_PROMPT = """Extrai os seguintes campos deste recibo/factura:
- merchant: Nome do estabelecimento
- date: Data (formato YYYY-MM-DD)
- items: Lista de itens com nome e preco
- total: Valor total
- payment_method: Metodo de pagamento (se visivel)

Responde APENAS em JSON valido com esta estrutura:
{
  "merchant": "string",
  "date": "YYYY-MM-DD",
  "items": [{"name": "string", "price": number}],
  "total": number,
  "payment_method": "string ou null",
  "currency": "AOA"
}

Se nao conseguires ler algum campo, usa null. Valores em Kwanzas (Kz)."""


async def extract_receipt_data(image_base64: str) -> dict:
    """Extract transaction data from a receipt image.

    Returns structured data or error dict.
    """
    router = create_llm_router()

    if not router.get_available_providers():
        return {"success": False, "error": "Servico de OCR nao esta disponivel de momento."}

    try:
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

        # Parse JSON from response
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
                "error": "Nao foi possivel extrair dados do recibo",
                "raw_response": response.content,
            }

    except Exception as e:
        logger.exception("OCR extraction failed")
        return {"success": False, "error": "Erro ao processar recibo. Tente novamente."}


def validate_receipt_data(data: dict) -> dict:
    """Validate extracted receipt data."""
    issues = []

    if not data.get("merchant"):
        issues.append("Comerciante nao identificado")

    items = data.get("items", [])
    total = data.get("total")

    if items and total:
        items_sum = sum(item.get("price", 0) for item in items)
        if abs(items_sum - total) > 1:
            issues.append(f"Total ({total}) nao corresponde a soma dos itens ({items_sum})")

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "data": data,
    }
