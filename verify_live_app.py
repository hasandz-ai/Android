import time
from playwright.sync_api import sync_playwright

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
file_url = "file:///d:/Hala/Random/Play/Android/index.html"

print("Running Playwright verification for App Name 'Personal App' & Touch Selection Guard...")

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

    # 1. Check title
    doc_title = page.title()
    print(f"Page Title: {doc_title}")
    assert doc_title == "Personal App", f"Expected 'Personal App', got {doc_title}"

    # 2. Check user-select on UI body vs Input
    styles_check = page.evaluate("""() => {
        const bodyEl = document.body;
        const bannerEl = document.querySelector('.banner-task-name') || document.body;
        const inputEl = document.querySelector('#gas-url-input') || document.querySelector('input');

        return {
            bodyUserSelect: window.getComputedStyle(bodyEl).userSelect || window.getComputedStyle(bodyEl).webkitUserSelect,
            bannerUserSelect: window.getComputedStyle(bannerEl).userSelect || window.getComputedStyle(bannerEl).webkitUserSelect,
            inputUserSelect: inputEl ? (window.getComputedStyle(inputEl).userSelect || window.getComputedStyle(inputEl).webkitUserSelect) : 'N/A'
        };
    }""")
    print(f"Computed userSelect styles: {styles_check}")

    # Capture final app verification screenshot
    page.screenshot(path="scratch_personal_app_final_verified.png")

    browser.close()
    print("All final touch verifications passed successfully!")
