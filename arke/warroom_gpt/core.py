from __future__ import annotations

from typing import Mapping, Sequence

from arke.gpt_oss_adapter import GPTOSSAdapter


def _default_prompt(messages: Sequence[Mapping[str, str]]) -> str:
    """
    Flatten the conversation into a lightweight textual prompt.

    The GPT-OSS adapter expects a token list, so we combine the roles and contents
    into a single sentence that preserves turn order.
    """
    if not messages:
        return ""
    parts: list[str] = []
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if not content:
            continue
        parts.append(f"{role.upper()}: {content}")
    return " ".join(parts)


class WarRoomGPT:
    """Thin orchestrator that reuses the GPT OSS adapter to answer chat prompts."""

    def __init__(self, adapter: GPTOSSAdapter | None = None) -> None:
        self.adapter = adapter or GPTOSSAdapter()

    async def generate_response(
        self, messages: Sequence[Mapping[str, str]], temperature: float = 0.7
    ) -> str:
        """
        Render a textual response for the provided conversation.

        The temperature knob is surfaced for API compatibility, although the
        current GPT OSS adapter does not yet consume it.
        """
        prompt = _default_prompt(messages)
        if not prompt:
            return ""
        tokens = prompt.split()
        return await self.adapter.generate(tokens)


_ENGINE = WarRoomGPT()


async def generate_response(messages: Sequence[Mapping[str, str]], temperature: float = 0.7) -> str:
    """Module-level helper mirroring the builder specification."""
    return await _ENGINE.generate_response(messages, temperature)
