
from pydantic import BaseModel, Field


class ChatMessageRequest(BaseModel):
    message: str = Field(max_length=2000)
    session_id: str | None = None
    conversation_history: list[dict] | None = None


class ChatMessageResponse(BaseModel):
    content: str
    agent: str
    session_id: str
    needs_confirmation: bool = False
    confirmation_data: dict | None = None
    tokens_input: int = 0
    tokens_output: int = 0
    model: str = ""
