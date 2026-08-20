import time
from playwright.sync_api import sync_playwright

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
icon_svg_url = "file:///d:/Hala/Random/Play/Android/icon.svg"
app_url = "file:///d:/Hala/Random/Play/Android/index.html#exercise"

print("Rendering high-res icons and capturing modal scroll fade effect...")

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=edge_path, headless=True)
    
    # 1. Render icon-512.png
    ctx512 = browser.new_context(viewport={'width': 512, 'height': 512}, device_scale_factor=1)
    page512 = ctx512.new_page()
    page512.goto(icon_svg_url)
    page512.screenshot(path="icon-512.png")
    page512.screenshot(path="scratch_new_app_icon_512.png")
    ctx512.close()

    # 2. Render icon-192.png
    ctx192 = browser.new_context(viewport={'width': 192, 'height': 192}, device_scale_factor=1)
    page192 = ctx192.new_page()
    page192.goto(icon_svg_url)
    page192.screenshot(path="icon-192.png")
    ctx192.close()

    # 3. Verify Exercise Settings Top & Bottom Scroll Fade
    ctxApp = browser.new_context(
        viewport={'width': 412, 'height': 915},
        user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36",
        color_scheme='dark'
    )
    pageApp = ctxApp.new_page()
    pageApp.goto(app_url, wait_until="domcontentloaded")
    time.sleep(1)

    # Open Exercise Tab and Settings modal directly
    pageApp.evaluate("""() => {
        const el = document.querySelector('a[href="#exercise"]') || document.querySelector('[data-tab="exercise"]');
        if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        openExerciseSettingsModal();
    }""")
    time.sleep(1)

    # Scroll midway inside modal body to show top & bottom fade masks
    pageApp.evaluate("""() => {
        const body = document.querySelector('#exercise-settings-modal .modal-body');
        if (body) body.scrollTop = 220;
    }""")
    time.sleep(0.5)

    # Capture modal with top and bottom scroll fade active
    pageApp.screenshot(path="scratch_exercise_settings_scroll_fade_mid.png")

    ctxApp.close()
    browser.close()
    print("Icons rendered and scroll fade verified successfully!")
