"""Pydantic models for API request/response schemas."""

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    tool_calls: list[dict] | None = None


class WalletInfo(BaseModel):
    address: str | None = None
    network_id: str | None = None
    status: str


class ToolInfo(BaseModel):
    name: str
    description: str | None = None
