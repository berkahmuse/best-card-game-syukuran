#!/usr/bin/env python3
"""Interactive playtest: play Lantern Row in headless Chromium with real clicks and
keys, the way a player would, and fail on any page error or stuck state."""
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT = 18083


def wait_for_server(url, timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except Exception:
            time.sleep(0.5)
    return False


def state(page):
    return page.evaluate(
        """() => {
        const s = window.__lantern.state;
        return { screen: window.__lantern.screen, phase: s.phase, turn: s.turn,
                 round: s.round, hand: s.player.hand.length, aiHand: s.ai.hand.length,
                 score: s.player.score, aiScore: s.ai.score,
                 market: s.market.length, deck: s.deck.length,
                 winner: s.winner, melds: s.player.melds.length };
    }"""
    )


def main():
    server = subprocess.Popen(
        ["node", "serve.ts", "--port", str(PORT)],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        assert wait_for_server(f"http://localhost:{PORT}/"), "server did not start"
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1280, "height": 720})
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.goto(f"http://localhost:{PORT}/?seed=7")
            page.wait_for_timeout(500)
            assert state(page)["screen"] == "title", state(page)
            # Start with Space.
            page.keyboard.press("Space")
            page.wait_for_timeout(200)
            assert state(page)["screen"] == "play", state(page)
            s0 = state(page)
            assert s0["hand"] == 5 and s0["market"] == 3 and s0["deck"] == 37, s0
            # Play up to 40 player turns: take market card 1, hint, meld, end turn.
            turns = 0
            for _ in range(40):
                s = state(page)
                if s["screen"] == "over" or s["phase"] == "over":
                    break
                assert s["turn"] == "player" and s["phase"] == "take", s
                hand_before = s["hand"]
                page.mouse.click(390, 273)  # first market card
                page.wait_for_timeout(120)
                s = state(page)
                assert s["phase"] in ("meld", "discard"), s
                assert s["hand"] == hand_before + 1, s
                page.keyboard.press("KeyH")
                page.wait_for_timeout(80)
                page.keyboard.press("KeyM")
                page.wait_for_timeout(80)
                # Discard down if the hand is over the limit.
                for _ in range(3):
                    s = state(page)
                    if s["phase"] != "discard":
                        break
                    page.mouse.click(700, 620)
                    page.wait_for_timeout(80)
                page.keyboard.press("KeyE")
                page.wait_for_timeout(150)
                turns += 1
            s = state(page)
            print(f"played {turns} player turns; final: {s}")
            assert turns >= 5, "too few turns played"
            assert s["round"] >= 5, s
            # Restart with R and confirm a fresh game.
            page.keyboard.press("KeyR")
            page.wait_for_timeout(200)
            s = state(page)
            assert s["screen"] == "play" and s["score"] == 0 and s["hand"] == 5, s
            # Pause and resume with P.
            page.keyboard.press("KeyP")
            page.wait_for_timeout(120)
            assert state(page)["screen"] == "paused", state(page)
            page.keyboard.press("KeyP")
            page.wait_for_timeout(120)
            assert state(page)["screen"] == "play", state(page)
            browser.close()
            if errors:
                print("PAGE ERRORS:")
                for e in errors:
                    print(" -", e)
                return 1
        print("PLAYTEST PASS")
        return 0
    finally:
        server.terminate()


if __name__ == "__main__":
    raise SystemExit(main())
