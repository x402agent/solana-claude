from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Element:
    id: str
    content: str
    kind: str  # "heading", "paragraph", "table", "list", "blockquote", "code", "form", "text"
    content_start_offset: Optional[int] = None
    content_end_offset: Optional[int] = None


@dataclass
class Image:
    url: str
    alt: str = ""


@dataclass
class ParseResult:
    content: str
    images: List[Image] = field(default_factory=list)
    form_elements: list = field(default_factory=list)
    url: str = ""
    elements: List[Element] = field(default_factory=list)
