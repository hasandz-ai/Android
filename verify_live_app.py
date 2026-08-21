import time
from playwright.sync_api import sync_playwright

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
file_url = "file:///d:/Hala/Random/Play/Android/index.html"

print("Running verification after removing change PIN option...")

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

    # 1. Unlock with code-defined math PIN 191919
    for digit in ["1", "9", "1", "9", "1", "9"]:
        page.click(f".pin-key[data-key='{digit}']")
        time.sleep(0.06)
    time.sleep(0.8)

    assert not page.is_visible("#app-lock-screen"), "Lock screen should unlock with 191919"
    print("Unlocked successfully with math-encrypted 191919!")

    # 2. Open Settings Modal
    page.evaluate("""() => {
        const modal = document.getElementById('settings-modal');
        if (modal) modal.classList.remove('hidden');
    }""")
    time.sleep(0.5)

    # Verify that change PIN button is gone
    has_change_pin_btn = page.is_visible("#btn-open-change-pin")
    print(f"Change PIN button present in settings: {has_change_pin_btn}")
    assert not has_change_pin_btn, "Change PIN button should be removed"

    # Capture Settings Modal showing clean security section
    page.screenshot(path="scratch_settings_security_cleaned.png")

    browser.close()
    print("All tests passed with 100% success!")
