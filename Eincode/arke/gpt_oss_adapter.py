from __future__ import annotations

import asyncio
from typing import Sequence


class GPTOSSAdapter:
    """Minimal adapter around the GPT-OSS-20B model."""

    def __init__(self, model_id: str = "openai/gpt-oss-20b") -> None:
        self.model_id = model_id
        self._pipeline = None

    def _get_pipeline(self):
        if self._pipeline is None:
            from transformers import pipeline  # Lazy import to avoid heavy dependency at import time

            self._pipeline = pipeline(
                "text-generation", model=self.model_id, torch_dtype="auto", device_map="auto"
            )
        return self._pipeline

    async def generate(self, tokens: Sequence[str]) -> str:
        """Generate text from a list of tokens using GPT-OSS-20B."""

        prompt = " ".join(tokens)
        pipe = self._get_pipeline()

        def _run() -> str:
            result = pipe(prompt, max_new_tokens=64)[0]["generated_text"]
            return result

        return await asyncio.to_thread(_run)
