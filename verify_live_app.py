import time
from playwright.sync_api import sync_playwright

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
file_url = "file:///d:/Hala/Random/Play/Android/index.html#exercise"

print("Running Playwright verification for Inverted Reset Button & Confirmation Stacking...")

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=edge_path, headless=True)
    context = browser.new_context(
        viewport={'width': 412, 'height': 915},
        user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36",
        color_scheme='dark'
    )
    page = context.new_page()

    # 1. Open Exercise Tab
    page.goto(file_url, wait_until="domcontentloaded")
    time.sleep(1)
    page.evaluate("""() => {
        const el = document.querySelector('a[href="#exercise"]') || document.querySelector('[data-tab="exercise"]');
        if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }""")
    time.sleep(1.5)

    # 2. Click Exercise Settings floating pill
    page.click("#exercise-floating-settings-btn")
    time.sleep(1)

    # Scroll inside modal body to show Reset Program section
    page.evaluate("""() => {
        const modalBody = document.querySelector('#exercise-settings-modal .modal-body');
        if (modalBody) modalBody.scrollTop = modalBody.scrollHeight;
    }""")
    time.sleep(0.5)

    # Capture modal with inverted Reset Button
    page.screenshot(path="scratch_inverted_reset_button_verified.png")

    # 3. Click Reset to Default Program button
    page.click("#modal-btn-reset-exercise-plan")
    time.sleep(0.8)

    # Capture confirmation modal displaying directly in front
    page.screenshot(path="scratch_reset_confirm_modal_front_verified.png")

    browser.close()
    print("Verification completed successfully!")
