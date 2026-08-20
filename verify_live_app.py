import time
from playwright.sync_api import sync_playwright

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
file_url = "file:///d:/Hala/Random/Play/Android/index.html"

print("Running Playwright verification for Mathematical PIN (191919)...")

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=edge_path, headless=True)
    context = browser.new_context(
        viewport={'width': 412, 'height': 915},
        user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36",
        color_scheme='dark'
    )
    page = context.new_page()

    page.goto(file_url, wait_until="domcontentloaded")
    time.sleep(1.5)

    # 1. Capture fixed lock screen with crisp vector icon
    page.screenshot(path="scratch_app_lock_fixed_icon.png")

    # 2. Unlock with 191919 (math formula: (191919 ^ 0x4B3F7) * 17 + 109 == 7095365)
    for digit in ["1", "9", "1", "9", "1", "9"]:
        page.click(f".pin-key[data-key='{digit}']")
        time.sleep(0.06)
    time.sleep(0.8)

    assert not page.is_visible("#app-lock-screen"), "Lock screen should unlock with 191919"
    print("Unlocked successfully with math-encrypted 191919!")

    # 3. Test Manual Lock Action
    page.evaluate("showLockScreen()")
    time.sleep(0.5)
    assert page.is_visible("#app-lock-screen"), "App should lock on showLockScreen"

    # 4. Unlock again with 191919
    for digit in ["1", "9", "1", "9", "1", "9"]:
        page.click(f".pin-key[data-key='{digit}']")
        time.sleep(0.06)
    time.sleep(0.8)
    assert not page.is_visible("#app-lock-screen"), "Lock screen should unlock again with 191919"

    browser.close()
    print("All tests passed with 100% success!")
