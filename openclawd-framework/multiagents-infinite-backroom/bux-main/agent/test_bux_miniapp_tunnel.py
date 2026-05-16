from __future__ import annotations

import importlib.machinery
import importlib.util
import os
import tempfile
import unittest
from pathlib import Path


AGENT_DIR = Path(__file__).resolve().parent


def _load_module():
    loader = importlib.machinery.SourceFileLoader(
        "bux_miniapp_tunnel", str(AGENT_DIR / "bux-miniapp-tunnel")
    )
    spec = importlib.util.spec_from_loader(loader.name, loader)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    return module


class MiniAppTunnelTest(unittest.TestCase):
    def setUp(self) -> None:
        self.module = _load_module()
        self.tmp = tempfile.TemporaryDirectory()
        self.env_path = Path(self.tmp.name) / "tg.env"

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_extract_tunnel_url_from_cloudflared_line(self) -> None:
        line = "|  https://personals-success-sharon-guidelines.trycloudflare.com  |"

        self.assertEqual(
            self.module._extract_tunnel_url(line),
            "https://personals-success-sharon-guidelines.trycloudflare.com",
        )

    def test_write_env_value_adds_url_and_preserves_existing_values(self) -> None:
        self.env_path.write_text("TG_BOT_TOKEN=token\nTG_OWNER_ID=42\n", encoding="utf-8")

        changed = self.module._write_env_value(
            self.env_path,
            "BUX_MINIAPP_PUBLIC_URL",
            "https://example.trycloudflare.com",
        )

        self.assertTrue(changed)
        self.assertEqual(
            self.env_path.read_text(encoding="utf-8"),
            "TG_BOT_TOKEN=token\nTG_OWNER_ID=42\nBUX_MINIAPP_PUBLIC_URL=https://example.trycloudflare.com\n",
        )

    def test_write_env_value_replaces_duplicates_once(self) -> None:
        os.chmod(self.env_path.parent, 0o700)
        self.env_path.write_text(
            "TG_BOT_TOKEN=token\n"
            "BUX_MINIAPP_PUBLIC_URL=https://old.trycloudflare.com\n"
            "BUX_MINIAPP_PUBLIC_URL=https://older.trycloudflare.com\n",
            encoding="utf-8",
        )

        changed = self.module._write_env_value(
            self.env_path,
            "BUX_MINIAPP_PUBLIC_URL",
            "https://new.trycloudflare.com",
        )

        self.assertTrue(changed)
        self.assertEqual(
            self.env_path.read_text(encoding="utf-8"),
            "TG_BOT_TOKEN=token\nBUX_MINIAPP_PUBLIC_URL=https://new.trycloudflare.com\n",
        )

    def test_write_env_value_is_noop_when_unchanged(self) -> None:
        self.env_path.write_text(
            "BUX_MINIAPP_PUBLIC_URL=https://same.trycloudflare.com\n",
            encoding="utf-8",
        )

        changed = self.module._write_env_value(
            self.env_path,
            "BUX_MINIAPP_PUBLIC_URL",
            "https://same.trycloudflare.com",
        )

        self.assertFalse(changed)

    def test_write_env_value_dedupes_even_when_first_value_matches(self) -> None:
        self.env_path.write_text(
            "BUX_MINIAPP_PUBLIC_URL=https://same.trycloudflare.com\n"
            "BUX_MINIAPP_PUBLIC_URL=https://stale.trycloudflare.com\n",
            encoding="utf-8",
        )

        changed = self.module._write_env_value(
            self.env_path,
            "BUX_MINIAPP_PUBLIC_URL",
            "https://same.trycloudflare.com",
        )

        self.assertTrue(changed)
        self.assertEqual(
            self.env_path.read_text(encoding="utf-8"),
            "BUX_MINIAPP_PUBLIC_URL=https://same.trycloudflare.com\n",
        )


if __name__ == "__main__":
    unittest.main()
